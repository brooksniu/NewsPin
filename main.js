const NOT_ENOUGH_DATA = "NO_DATA";
const UNFAVED_BUTTON_CLASS = 'bi bi-heart py-1 px-3 cursor-pointer text-slate-500';
const FAVED_BUTTON_CLASS = 'bi bi-heart-fill py-1 px-3 cursor-pointer text-red-500';
const RECOMMENDER_KEYWORD_LIMIT = 5;
const TIMELINE_KEYWORD_LIMIT = 3;

let conversation = []; // Store conversation history
let useLocalStorage = true;
let defaultUserHistory = {searchHistory: {}, categoryHistory: {}, viewedNews: {}, favNews: []};
let userHistory = useLocalStorage ? JSON.parse(localStorage.getItem("userNewsHistory")) || defaultUserHistory : defaultUserHistory; // Store user actions

const apiKey = 'f97bf0827b7ffb71784b746556766e84';

// If need to clear userHistory, use localStorage.removeItem("userNewsHistory");

function clearUserHistory(){
    userHistory = defaultUserHistory;
    localStorage.removeItem("userNewsHistory");
    location.reload();
}

async function openChat(newsContent) {
    // console.log('openChat called with content:', newsContent); // 添加此行来跟踪函数调用
    document.getElementById('chatModal').style.display = 'block';
    document.getElementById('chatHistory').innerHTML = ''; // Reset chat history
    conversation = []; // Clear conversation history
    let formattedContent = "Here is the news content: " + newsContent + "\nWrite a concise summary of this news in 2 to 3 sentences.";
    sendChat(formattedContent, true); // Send initial news content as a message with a summarization task
}

async function sendChat(message, initial = false) {
    if (!message && !initial) {
        message = document.getElementById('chatInput').value;
        document.getElementById('chatInput').value = ''; // Clear the input after sending
    }
    conversation.push({"role": "user", "content": message}); // Add user message to conversation history
    if (!initial){
        appendMessage('You', message, 'user'); // Show user message in chat history
    }
    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({conversation: conversation})
        });
        const data = await response.json();
        conversation.push({"role": "assistant", "content": data.response}); // Add assistant response to conversation history
        appendMessage('Assistant', data.response, 'assistant'); // Show assistant's response in chat history
    } catch (error) {
        console.error('Error during chat:', error);
        appendMessage('Error', 'Failed to fetch response.', 'error'); // Show error in chat history
    }
}

function appendMessage(sender, message, type) {
    let chatHistory = document.getElementById('chatHistory');
    let messageElement = document.createElement('div');
    messageElement.classList.add('message', type);
    messageElement.textContent = `${sender}: ${message}`;
    chatHistory.appendChild(messageElement);
    chatHistory.scrollTop = chatHistory.scrollHeight; // Auto-scroll to the latest message
}

function closeChat() {
    document.getElementById('chatModal').style.display = 'none';
}

function setCurrentDate() {
    const dateElement = document.getElementById('currentDate');
    dateElement.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

async function initializeNews() {
    setCurrentDate();
    fetchNews('general'); // Fetch global general news by default
}

// for search button, get content from input field
async function searchAndUpdate(n_return = 10) {
    searchQuery = document.getElementById('searchInput').value;
    if (!searchQuery){
        return
    }
    const newsArticles = await searchNews(searchQuery, n_return);
    updateNews(newsArticles)
}

// given searchQuery : str , returns the results
// n_return: number of articles returned
async function searchNews(searchQuery = '', n_return = 10) {
    // check for empty query
    if (!searchQuery){
        return
    }

    const url = `https://gnews.io/api/v4/search?q="${searchQuery}"&lang=en&token=${apiKey}&expand=content`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.articles) {
            return data.articles;
        } else {
            console.error('No articles found:', data);
            alert('No articles found. Please try a different query.');
        }
    } catch (error) {
        console.error('Error fetching news:', error);
        // alert('Failed to fetch news. Please check the console for more details.');
    }
}


async function fetchNews(category = 'general', element = null, recommendation = false) {
    // Change button colors
    if (element) {
        const links = document.querySelectorAll('#categoryNav a');
        links.forEach(link => link.classList.replace('text-blue-500', 'text-gray-700'));
        element.classList.replace('text-gray-700', 'text-blue-500');
    }

    // Change selection (top stories vs. your favorite)
    const selection = document.getElementById("pages");
    selection.options[0].selected = true;

    // Generate search query dynamically based on whether user chooses recommendation
    let searchQuery = false;

    if(recommendation){
        searchQuery = await generatePersonalizedQuery();
    }

    const url = `https://gnews.io/api/v4/top-headlines?category=${category}${(searchQuery && searchQuery != NOT_ENOUGH_DATA) ? "&q="+encodeURIComponent(searchQuery) : ""}&lang=en&token=${apiKey}&expand=content`;

    // save user history
    if(!recommendation && category != 'general'){
        saveUserHistory(userHistory.categoryHistory, category);
        // console.log("test")
    }
    if(!recommendation && searchQuery){
        saveUserHistory(userHistory.searchHistory, searchQuery);
    }
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.articles) {
            updateNews(data.articles);
        } else {
            console.error('No articles found:', data);
            alert('No articles found. Please try a different query.');
        }
    } catch (error) {
        console.error('Error fetching news:', error);
        // alert('Failed to fetch news. Please check the console for more details.');
    }

    // DEBUG: mock articles list, doesn't use gnews api quota. Either use this or the try-catch block above
    // updateNews(mockArticles);
}

function updateNews(articles) {
    const newsContainer = document.getElementById('newsContainer');
    newsContainer.innerHTML = '';
    articles.forEach(article => {
        const newsArticle = document.createElement('div');
        newsArticle.className = 'col-span-1 bg-white p-4 rounded-lg shadow mb-4';
        const articleLink = document.createElement('a');
        articleLink.href = article.url;
        articleLink.target = '_blank';
        articleLink.innerHTML = `
        <img src="${article.image || 'path_to_default_image.jpg'}" alt="${article.title}" class="rounded-lg mb-4">
        <h3 class="text-lg font-semibold mb-2">${article.title}</h3>
        <p class="text-gray-600 text-sm">${new Date(article.publishedAt).toLocaleDateString()} - ${article.source.name}</p>
        <p>${article.description}</p>
        `;
        articleLink.onclick = () => saveUserHistory(userHistory.viewedNews, article.title);
        const chatButton = document.createElement('button');
        chatButton.textContent = 'Summary & Discuss';
        chatButton.onclick = () => {
            saveUserHistory(userHistory.viewedNews, article.title);
            openChat(article.content);
        };
        // divider for better visuals
        const divider = document.createElement('div');
        divider.className = 'divider';
        divider.textContent = '|'
        // button for timeline functions
        const timelineButton = document.createElement('button');
        timelineButton.textContent = 'TimeLine';
        timelineButton.onclick = async () => {
            saveUserHistory(userHistory.viewedNews, article.title);
            let timeline_keywords = await genTimelineQuery(article.content);
            showPopup(timelineButton, timeline_keywords, article);
            // await fetchNews('general', null, false, false, timeline_keywords)
            // console.log(JSON.stringify(article));
        };
        const favButton = document.createElement('i');
        favButton.className = userHistory.favNews.some(a => a.title == article.title) ? FAVED_BUTTON_CLASS : UNFAVED_BUTTON_CLASS;
        favButton.onclick = () => {toggleUserFavorite(favButton, article)};

        newsArticle.appendChild(articleLink);
        newsArticle.appendChild(chatButton);
        newsArticle.appendChild(divider);
        newsArticle.appendChild(timelineButton);
        newsArticle.appendChild(favButton);
        newsContainer.appendChild(newsArticle);
    });
}

function saveUserHistory(object, field){
    let oldHistory = object[field];
    if(oldHistory){
        object[field] = oldHistory + 1;
    }else{
        object[field] = 1;
    }
    console.log(userHistory);
    localStorage.setItem("userNewsHistory", JSON.stringify(userHistory));
}

// given article content, get related news keywords
async function genTimelineQuery(content){
    let queryMessage = 
        `Imagine you're an advanced news recommendation system. 
Based on this article content, generate at most ${TIMELINE_KEYWORD_LIMIT} keywords as the names of main person in the news or the company names or the locations. Concatenate them with the keyword OR. 
If there's not enough data, just return ${NOT_ENOUGH_DATA}.
${JSON.stringify(content)}`;
    let message = [{"role": "user", "content": queryMessage}];
    // console.log(queryMessage);
    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({conversation: message})
        });
        const data = await response.json();
        // console.log(data.response);
        return data.response;
    } catch (error) {
        console.error('Error during chat:', error);
        appendMessage('Error', 'Failed to fetch response.', 'error'); // Show error in chat history
    }
}

// given article content, get rankings of relations
async function genTimelineSummary(main_article, keyword, retrieved_articles){
    let queryMessage = `"main_article": ${JSON.stringify(main_article)}; "keyword": ${keyword}; "Retrieved": ${retrieved_articles}`;
    let message = [{"role": "system", "content": `You are an advanced and helpful news recommendation and summarization system. Your summarization should be 
                    concise and without any redundant sentences such as "This article talks about...". 
                    You will be given a main article starting with label "main_article", a keyword starting with label "keyword", and an array of JSON objects starting after label "Retrieved", containing meatadata and content of 10 articles.
                    Your job is to select articles in "Retrieved" that satisfies any of the two conditions: 1. either a cause or followup of the main_article. 
                     2. closely relates to the "main_article", especially the "keyword" given the context of "main_article".
                    Please give the response in JSON format following this template:
                    {"index": [array of selected indicies of articles, arranged in time order], "summary": [concise plain text summary of the selected articles, mention the "keyword" and arrange the same order as in the "index" array]}
                    You can select up to 6 articles. Do not select article with similar content as the selected ones. If, objectively, there is no article related, answer with {"index":[], "summary":[]}.` },
                    {"role": "user", "content": queryMessage}];
    // console.log(queryMessage);
    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({conversation: message})
        });
        const data = await response.json();
        // console.log(data.response);
        return data.response;
    } catch (error) {
        console.error('Error during chat:', error);
        appendMessage('Error', 'Failed to fetch response.', 'error'); // Show error in chat history
    }
}

// button: the button when clicked to show the popup
// content: here, specifically for a json object as retured in genTimelineSummary
// content formatted as {"index": [array of selected indicies of articles, arranged in time order], "summary": [concise plain text summary of the selected articles, arranged the same order as in the "index" array ]}
// articles: all article in the LLM query (10 articles)
function textPopup(button, content, articles){
    const popup = document.createElement('div');
    popup.className = 'popup';
    document.body.appendChild(popup);
    let rect = button.getBoundingClientRect();
    popup.style.top = rect.top + window.scrollY + rect.height + 'px';
    popup.style.left = rect.left + window.scrollX + 'px';
    popup.style.display = 'block';

    document.addEventListener('click', function hidePopup(event) {
        if (!popup.contains(event.target) && event.target !== button) {
            popup.remove();
            document.removeEventListener('click', hidePopup);
        }
    });
    // this button displayes the timeline summaries, when clicked, refill the page with timeline news contents
    const jumpTimelineButton = document.createElement('button');
    popup.appendChild(jumpTimelineButton);
    // get selected indicies, reverse to get time order from past --> now
    const keys = content['index'].reverse();
    // get corresponding contents
    const summaries = content['summary'].reverse();
    // give timeline text, select articles for jump
    let selectArticles = []

    // Here, go through each selection to display summary and construct jumping page
    for (const ind in keys) {
        // console.log(articles[key])
        // select with index of the current selected article in all searched
        const currentArticle = articles[keys[ind]]
        // create timeline text
        // get time of article
        const newsDate = '[ ' + currentArticle.publishedAt.substring(0,10) + ' ]'
        const summary = document.createElement('div');
        // get summary from LLM summaries
        summary.innerText = newsDate + summaries[ind];
        jumpTimelineButton.appendChild(summary);

        // arrow
        const arrow = document.createElement('div');
        arrow.className = 'divider';
        arrow.textContent = '↓';
        // add arrow if not last entry
        if (ind != (keys.length - 1)){
            jumpTimelineButton.appendChild(arrow);
        }

        // select articles
        selectArticles.push(currentArticle)
    }

    // if clicked, refill page with selected news
    jumpTimelineButton.onclick = async () => {
            popup.remove();
            await updateNews(selectArticles);
        };

}

function showPopup(button, content, main_article) {
    let popup = document.createElement('div');
    popup.className = 'popup';
    document.body.appendChild(popup);
    
    let rect = button.getBoundingClientRect();
    popup.style.top = rect.top + window.scrollY + rect.height + 'px';
    popup.style.left = rect.left + window.scrollX + 'px';
    popup.style.display = 'block';

    document.addEventListener('click', function hidePopup(event) {
        if (!popup.contains(event.target) && event.target !== button) {
            popup.remove();
            document.removeEventListener('click', hidePopup);
        }
    });

    const divider = document.createElement('div');
    divider.className = 'divider';
    divider.textContent = '|'
    popup.appendChild(divider)

    // display keywords 
    const keywords = content.split("OR")
    keywords.forEach(keyword => {
        const divider = document.createElement('div');
        divider.className = 'divider';
        divider.textContent = '|'
        const timelineButton = document.createElement('button');
        timelineButton.textContent = keyword;
        // onclick: LLM search & Summary & Recommend
        timelineButton.onclick = async () => {
            document.body.style.cursor = 'wait';
            articles = await searchNews(keyword);
            timeline_summary = await genTimelineSummary(main_article, keyword, articles);
            // console.log(timeline_summary)
            timeline_selections = JSON.parse(timeline_summary)
            console.log(timeline_selections)
            textPopup(timelineButton, timeline_selections, articles)
            document.body.style.cursor = 'default';
        };
        popup.appendChild(timelineButton)
        popup.appendChild(divider)
    });
}

async function generatePersonalizedQuery(){
    // parse user history such that it only contains title
    let userHistoryForQuery = JSON.parse(JSON.stringify(userHistory)); // Deep copy
    userHistoryForQuery.favNews = userHistory.favNews.map(a => a.title);

    // generate OpenAI prompt
    let queryMessage = 
    `Imagine you're an advanced news recommendation system. 
    Based on this user view and search history data along with their frequency, infer at most ${RECOMMENDER_KEYWORD_LIMIT} keywords on general news category or very specific events that best fit the user's preferences. 
    Wrap each keyword with "" and concatenate them with the keyword OR. 
    If there's not enough data, just return ${NOT_ENOUGH_DATA}.
    ${JSON.stringify(userHistoryForQuery)}`;
    let message = [{"role": "user", "content": queryMessage}];
    console.log(queryMessage);
    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({conversation: message})
        });
        const data = await response.json();
        console.log(data.response);
        return data.response;
    } catch (error) {
        console.error('Error during chat:', error);
        appendMessage('Error', 'Failed to fetch response.', 'error'); // Show error in chat history
    }
}

function changePages(selectedValue){
    const links = document.querySelectorAll('#categoryNav a');
    links.forEach(link => link.classList.replace('text-blue-500', 'text-gray-700'));
    if(selectedValue == 'topStories'){
        fetchNews();
    }else if(selectedValue == 'yourFavorite'){
        updateNews(userHistory.favNews);
    }
}

function toggleUserFavorite(favButton, article) {
    if(userHistory.favNews.some(a => a.title == article.title)){
        // unfavorite
        favButton.className = UNFAVED_BUTTON_CLASS;
        userHistory.favNews = userHistory.favNews.filter(a => a.title != article.title);
    }else{
        // favorite
        favButton.className = FAVED_BUTTON_CLASS;
        userHistory.favNews.push(article);
    }
    saveUserHistory(userHistory.favNews, article);
}

