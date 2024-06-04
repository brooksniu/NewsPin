const NOT_ENOUGH_DATA = "NO_DATA";
const UNFAVED_BUTTON_CLASS = 'bi bi-heart py-1 px-3 cursor-pointer text-slate-500';
const FAVED_BUTTON_CLASS = 'bi bi-heart-fill py-1 px-3 cursor-pointer text-red-500';
const RECOMMENDER_KEYWORD_LIMIT = 5;
const TIMELINE_KEYWORD_LIMIT = 3;

let conversation = []; // Store conversation history
let useLocalStorage = true;
let defaultUserHistory = {searchHistory: {}, categoryHistory: {}, viewedNews: {}, favNews: []};
let userHistory = useLocalStorage ? JSON.parse(localStorage.getItem("userNewsHistory")) || defaultUserHistory : defaultUserHistory; // Store user actions

const apiKey = '87ba49e3d3117bd689cce790607d669c';

// If need to clear userHistory, use localStorage.removeItem("userNewsHistory");

function clearUserHistory(){
    userHistory = defaultUserHistory;
    localStorage.removeItem("userNewsHistory");
    location.reload();
}

async function openChat(newsContent) {
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

    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent("(" + searchQuery.trim() + ")")}&lang=en&max=${n_return}&token=${apiKey}&expand=content`;

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
        chatButton.className = "textButton";
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
        timelineButton.className = 'textButton';
        timelineButton.textContent = 'TimeLine';
        timelineButton.onclick = async () => {
            saveUserHistory(userHistory.viewedNews, article.title);
            let timeline_keywords = await genTimelineQuery(article.content);
            // console.log(timeline_keywords);
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

// keep only json format in returned string from LLM
function clear_json(json_str){
    if (json_str[0] != '{'){
        // console.log('clearing json string: ', json_str);
        json_str = json_str.match(/{.*}/);
    };  
    return json_str;
}

function saveUserHistory(object, field){
    let oldHistory = object[field];
    if(oldHistory){
        object[field] = oldHistory + 1;
    }else{
        object[field] = 1;
    }
    // console.log(userHistory);
    localStorage.setItem("userNewsHistory", JSON.stringify(userHistory));
}

// given article content, get related news keywords
async function genTimelineQuery(content){
    let queryMessage = 
        `You are an advanced news recommendation system. 
Based on this article content, generate ${TIMELINE_KEYWORD_LIMIT} keywords as the full names of main person in the news or the company names or the locations. Wrap each keyword with () and concatenate them with the keyword OR.
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

// Old prompt:
// the selected article should talk about the "keyword" under the context of "main_article". 
// Your job is to select articles in "Retrieved" that is either a cause or followup of the main_article related to the "keyword".

// given article content, get rankings of relations
async function genTimelineSummary(main_article, keyword, retrieved_articles_json) {
    retrieved_articles_json.push(main_article);
    let retrieved_articles = retrieved_articles_json.map(article => ({
        title: article.title,
        description: article.description,
        content: article.content,
        publishedAt: article.publishedAt
    }));

    try {
        let selectArticles = [];
        // check duplicate due to multiple sources
        let titles = [];
        let nodup_ind = [];
        for (const ind in retrieved_articles) {
            if (!titles.includes(retrieved_articles[ind].title.toLowerCase())) {
                selectArticles.push(retrieved_articles[ind]);
                nodup_ind.push(ind);
            };
            titles.push(retrieved_articles[ind].title.toLowerCase())
        }
        // console.log("indicies_noduplicate: ", nodup_ind);
        // console.log("selectArticles: ", selectArticles);
        if (selectArticles.length == 0) {
            return { "index": [], "summary": [] }
        }

        let relation = await Promise.all(selectArticles.map(async (article) => {
            let summaryQuery = `"main_article": ${main_article.title}, "keyword": [${keyword}]; "Selected": [${article.description}]`;
            let summary_message = [
                {
                    "role": "system",
                    "content": `You are an advanced and helpful news relationship classification system. 
                                You will be given a main article starting with label "main_article", a keyword starting with label "keyword", and a JSON object starting after label "Selected", containing summary of a selected article.
                                Your job is to classify whether two articles are related to each other regarding the "keyword". 
                                Please give the response with true and false only, "true" if two articles are related with respect to keyword, "false" otherwise.`
                },
                {
                    "role": "user",
                    "content": summaryQuery
                }
            ];

            try {
                let relate = await fetch('/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ conversation: summary_message })
                });

                let relation_res = await relate.json();
                // console.log("LLM Classification for article:", article.title, "<--", relation_res.response, "-->", main_article.title);
                return relation_res.response;
            } catch (error) {
                console.error('Error:', error);
                throw error;
            }
        }));

        // console.log('All articles processed.');
        const { selected_ind, selected_summaries } = await summarizer(relation, keyword, selectArticles, nodup_ind);
        const data = { "index": selected_ind, "summary": selected_summaries };
        // console.log('LLM Final Timeline: ', data);
        return data;
    } catch (error) {
        alert('Oops, there is an error! :', error);
        console.error('Error during chat:', error);
        appendMessage('Error', 'Failed to fetch response.', 'error'); // Show error in chat history
    }
}

async function summarizer(relation, keyword, selectArticles, nodup_ind) {
    const summaryPromises = relation.map(async (rel, ind) => {
        if (rel.toLowerCase() === "true") {
            let summaryQuery = `"keyword": [${keyword}]; "Selected": [${selectArticles[ind].content}]`;
            let summary_message = [
                {
                    "role": "system",
                    "content": `You are an advanced and helpful news summarization system. Your summarization should be 
                                concise and without any redundant sentences such as "This article talks about...". 
                                You will be given a keyword starting with label "keyword", and a JSON object starting after label "Selected", containing meatadata and content of a selected article.
                                Your job is to concisely summarize the "Selected" article mentioning "keyword".
                                Please give the response with one concise plain text summary of the "content" field for the "Selected" article given, following this example:
                                "1 to 2 very concise sentences of at most 100 words summarizing for the Selected article with keyword"`
                },
                {
                    "role": "user",
                    "content": summaryQuery
                }
            ];
            let summaries = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ conversation: summary_message })
            });
            let LLM_summary = await summaries.json();
            // console.log("LLM_summary for article: ", selectArticles[ind].title, " Summarization: ", LLM_summary.response);
            return {
                summary: LLM_summary.response,
                index: nodup_ind[ind]
            };
        }
        return null;
    });

    const results = await Promise.all(summaryPromises);
    const selected_ind = [];
    const selected_summaries = [];

    results.forEach(result => {
        if (result !== null) {
            selected_ind.push(result.index);
            selected_summaries.push(result.summary);
        }
    });

    return { selected_ind, selected_summaries };
}

// button: the button when clicked to show the popup
// content: here, specifically for a json object as retured in genTimelineSummary
// content formatted as {"index": [array of selected indicies of articles, arranged in time order], "summary": [concise plain text summary of the selected articles, arranged the same order as in the "index" array ]}
// articles: all article in the LLM query (10 articles)
function textPopup(button, content, articles){
    // boolean variable for whether we're displaying a timeline
    const noTimeline = articles.length == 0 || content['index'].length == 0;
    const popup = document.createElement('div');
    popup.className = 'popup';
    document.body.appendChild(popup);
    let rect = button.getBoundingClientRect();
    popup.style.top = rect.top + window.scrollY + rect.height + 'px';
    popup.style.left = Math.min(rect.left + window.scrollX, noTimeline ? 1100 : 800) + 'px';
    popup.style.display = 'block';

    document.addEventListener('click', function hidePopup(event) {
        if (!popup.contains(event.target) && event.target !== button) {
            popup.remove();
            document.removeEventListener('click', hidePopup);
        }
    });

    // If there's no articles retrieved or selected, display "no timeline for this topic for now"
    if(noTimeline){
        const noTimelineMessage = document.createElement('p');
        noTimelineMessage.innerHTML = `No timeline available about <i>${button.textContent}</i> for now`;
        noTimelineMessage.style.color = 'grey';
        popup.appendChild(noTimelineMessage);
        return;
    }

    // this button displayes the timeline summaries, when clicked, refill the page with timeline news contents
    const jumpTimelineButton = document.createElement('button');
    jumpTimelineButton.className = "textButton";
    popup.appendChild(jumpTimelineButton);
    // get selected indicies, reverse to get time order from past --> now
    const keys = content['index'].reverse();
    // get corresponding contents
    const summaries = content['summary'].reverse();
    // give timeline text, select articles for jump
    let selectArticles = []

    // Here, go through each selection to display summary and construct jumping page
    for (const ind in keys) {
        // select with index of the current selected article in all searched
        const currentArticle = articles[keys[ind]]
        // create timeline text
        // get time of article
        const options = {
            dateStyle: "medium",
            timeZone: "America/Los_Angeles"
          };
        const newsDate = '[ ' + new Date(currentArticle.publishedAt).toLocaleDateString("en-US", options) + ' ] '
        const summary = document.createElement('div');
        // get summary from LLM summaries
        summary.innerText = newsDate + summaries[ind];
        jumpTimelineButton.appendChild(summary);

        // arrow
        const arrow = document.createElement('div');
        arrow.className = 'divider';
        arrow.textContent = '↓';
        if(ind == 0){
            arrow.textContent = '===================================================';
        };
        
        // add arrow if not last entry
        if (ind != (keys.length - 1)){
            jumpTimelineButton.appendChild(arrow);
        }

        // select articles
        selectArticles.push(currentArticle)
    }

    // console.log(selectArticles)

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
    popup.style.left = Math.min(rect.left + window.scrollX, 1100) + 'px';
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
        // clean up the space and parenthesis for keywords
        keyword = keyword.trim();
        keyword = keyword.substring(1, keyword.length - 1);
        // Format keywords
        const divider = document.createElement('div');
        divider.className = 'divider';
        divider.textContent = '|'
        const timelineButton = document.createElement('button');
        timelineButton.className = "textButton";
        timelineButton.textContent = keyword;
        // onclick: LLM search & Summary & Recommend
        timelineButton.onclick = async () => {
            document.body.style.cursor = 'wait';
            articles = await searchNews(keyword, n_return=10);
            if(articles.length == 0){
                textPopup(timelineButton, null, articles);
            }else{
                timeline_summary = await genTimelineSummary(main_article, keyword, articles);
                textPopup(timelineButton, timeline_summary, articles)
            }
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
    let queryMessage = JSON.stringify(userHistoryForQuery);
    let message = [{"role": "system", "content": `Imagine you're an advanced news recommendation system. 
    Based on this user view and search history data along with their frequency, infer at most ${RECOMMENDER_KEYWORD_LIMIT} keywords on general news category or very specific events that best fit the user's preferences.
    Each keyword has to be at most 2 English words.  
    Wrap each keyword with () and concatenate them with the keyword OR. Add white space to both sides of the OR.  
    If there's not enough data, just return ${NOT_ENOUGH_DATA}.`},
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

        // selected_summaries = []
        // // separately go through each article to avoid hallucination
        // for (const ind in selectArticles) {
        //     let summaryQuery = `"description": [${main_article.title}]; "keyword": [${keyword}]; "Selected": [${selectArticles[ind]}]`; 
        //     let summary_message = [{"role": "system", "content": `You are an advanced and helpful news summarization system. Your summarization should be 
        //             concise and without any redundant sentences such as "This article talks about...". 
        //             You will be given a description starting with label "description", a keyword starting with label "keyword", and a JSON object starting after label "Selected", containing meatadata and content of a selected article.
        //             Your job is to concisely summarize the "Selected" article, DO NOT include any content of "description" into the summarization! If the "Selected" article is not related with the "keyword" under the context of "description", use only word none as response without any newline characters.
        //             Please give the response with one concise plain text summary of the "content" field for the "Selected" article given, following this example:
        //             "1 to 3 concise sentences summarizing for the Selected article"` },
        //             {"role": "user", "content": summaryQuery}];
        //     let summaries = await fetch('/chat', {
        //         method: 'POST',
        //         headers: {
        //             'Content-Type': 'application/json'
        //         },
        //         body: JSON.stringify({conversation: summary_message})
        //     });
        //     let LLM_summary = await summaries.json();
        //     console.log("LLM_summary for article: ", selectArticles[ind].title, " Summarization: ", LLM_summary.response);
        //     LLM_summary = LLM_summary.response;
        //     selected_summaries.push(LLM_summary);
        // }

        // let summaryQuery = `"main_article": ${JSON.stringify(main_article)}; "keyword": ${keyword}; "Retrieved": ${selectArticles}`;
        // let summaryQuery = `"Retrieved": ${selectArticles}`;
        // mention the "keyword" and
        // mention the "keyword" in summarization and show relationship between each article and "main_article"        
        // You will be given an array of JSON objects starting after label "Selected", containing meatadata and content of selected articles.
        // let summary_message = [{"role": "system", "content": `You are an advanced and helpful news summarization system. Your summarization should be 
        //             concise and without any redundant sentences such as "This article talks about...". 
        //             You will be given a keyword starting with label "keyword", and an array of JSON objects starting after label "Selected", containing meatadata and content of selected articles.
        //             Your job is to concisely summarize each article after label "selected". If you think any article is not related with the "keyword", put "" in the response array for that article.
        //             Please give the response in JSON format with one array of concise plain text summary of the "content" field for each article given, keep the same order as in the "selected" array, following this example:
        //             {"summary": [few sentences summary for each article, separated with ","]}
        //             reply with a JSON obejct and nothing else, the message should begin with { ` },
        //             {"role": "user", "content": summaryQuery}];
        // "summary": [array of concise plain text summary of each article given, mention the "keyword" and arrange the same order as in the "index" array]
        // get summaries
        

        // exclude hallucination
        // let verified_ind = []
        // let verified_summary = []
        // // create new indicies based on the summarizer
        // for (const ind in selected_summaries) {
        //     if (relation[ind].toLowerCase() == "true"){
        //         verified_ind.push(nodup_ind[ind]);
        //         verified_summary.push(selected_summaries[ind]);
        //     }
        // }
        // condense into one json string
        // const data = {"index":verified_ind, "summary": verified_summary};

                // let relation = []
        // // go through each summary to determine relativeness
        // for (const ind in selectArticles) {
        //     let summaryQuery = `"main_article": ${main_article.title}, "keyword": [${keyword}]; "Selected": [${selectArticles[ind].description}]`; 
        //     let summary_message = [{"role": "system", "content": `You are an advanced and helpful news relationship classification system. 
        //             You will be given a main article starting with label "main_article", a keyword starting with label "keyword", and a JSON object starting after label "Selected", containing summary of a selected article.
        //             Your job is to classify whether two articles are related to each other regarding the "keyword". 
        //             Please give the response with true and false only, "true" if two articles are related with respect to keyword, "false" otherwise.` },
        //             {"role": "user", "content": summaryQuery}];
        //     let realte = await fetch('/chat', {
        //         method: 'POST',
        //         headers: {
        //             'Content-Type': 'application/json'
        //         },
        //         body: JSON.stringify({conversation: summary_message})
        //     });
        //     let relation_res = await realte.json();
        //     // console.log("current article: ", selectArticles[ind])
        //     console.log("LLM Classification for article: ", selectArticles[ind].title, "<--", relation_res.response,"-->", main_article.title);
        //     relation.push(relation_res.response);
        // }

            // let queryMessage = `"main_article": ${JSON.stringify(main_article.content)}; "keyword": ${keyword}; "Retrieved": ${retrieved_articles}`;
    // let message = [{"role": "system", "content": `You are an advanced and helpful news recommendation system. 
    //                 You will be given a main article starting with label "main_article", a keyword starting with label "keyword", and an array of JSON objects starting after label "Retrieved", containing meatadata and content of up to 10 articles (could be less than 10).
    //                 Your job is to select articles in "Retrieved" that satisfies any of the two conditions: 1. either a cause or followup of the "main_article". 
    //                  2. closely relates to the "main_article", especially the "keyword" given the context of "main_article".
    //                 You can select up to 6 articles. Provide your response with only the json object and nothing else. Your selection should be within range of indicies in "Retrieved".
    //                 Please give the response in JSON format following this template:
    //                 {"index": [array of selected indicies of articles, arranged in time order]}
    //                 reply with only a JSON obejct and nothing else, do not include triple quotes, the message should begin with { ` },
    //                 {"role": "user", "content": queryMessage}];
    // console.log('retrieved_articles_json', retrieved_articles_json);
    // console.log('retrieved_articles', retrieved_articles);
    // console.log(message);


            // get indicies 
        // const selection_response = await fetch('/chat', {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json'
        //     },
        //     body: JSON.stringify({conversation: message})
        // }); 
        // let indicies = await selection_response.json();
        // console.log("indicies_uncleared: ", indicies.response);
        // indicies = JSON.parse(clear_json(indicies.response));
        // get selected contents

        // async function summarizer(relation, keyword, selectArticles, nodup_ind) {
//     let selected_ind = [];
//     let selected_summaries = [];
//     // separately go through each article to avoid hallucination
//     for (const ind in relation) {
//         console.log('relationship: ', relation[ind].toLowerCase())
//         if (relation[ind].toLowerCase() == "true") {
//             let summaryQuery = `"keyword": [${keyword}]; "Selected": [${selectArticles[ind].content}]`;
//             let summary_message = [
//                 {
//                     "role": "system",
//                     "content": `You are an advanced and helpful news summarization system. Your summarization should be 
//                                 concise and without any redundant sentences such as "This article talks about...". 
//                                 You will be given a keyword starting with label "keyword", and a JSON object starting after label "Selected", containing meatadata and content of a selected article.
//                                 Your job is to concisely summarize the "Selected" article mentioning "keyword".
//                                 Please give the response with one concise plain text summary of the "content" field for the "Selected" article given, following this example:
//                                 "1 to 2 very concise sentences of at most 100 words summarizing for the Selected article with keyword"`
//                 },
//                 {
//                     "role": "user",
//                     "content": summaryQuery
//                 }
//             ];
//             let summaries = await fetch('/chat', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json'
//                 },
//                 body: JSON.stringify({ conversation: summary_message })
//             });
//             let LLM_summary = await summaries.json();
//             console.log("LLM_summary for article: ", selectArticles[ind].title, " Summarization: ", LLM_summary.response);
//             LLM_summary = LLM_summary.response;
//             selected_summaries.push(LLM_summary);
//             selected_ind.push(nodup_ind[ind]);
//         }
//     }
//     return { selected_ind, selected_summaries };
// }

// async function genTimelineSummary(main_article, keyword, retrieved_articles_json){
//     retrieved_articles_json.push(main_article);
//     let retrieved_articles = retrieved_articles_json.map(article => ({
//         title: article.title,
//         description: article.description,
//         content: article.content,
//         publishedAt: article.publishedAt
//     }));

//     try {
//         let selectArticles = [];
//         // check duplicate due to multiple sources
//         let titles = [];
//         let nodup_ind = [];
//         for (const ind in retrieved_articles) {
//             if (!titles.includes(retrieved_articles[ind].title.toLowerCase())){
//                 selectArticles.push(retrieved_articles[ind]);
//                 nodup_ind.push(ind);
//             };
//             titles.push(retrieved_articles[ind].title.toLowerCase())
//         }
//         console.log("indicies_noduplicate: ", nodup_ind);
//         console.log("selectArticles: ", selectArticles);
//         if (selectArticles.length == 0){
//             return {"index":[], "summary": []}
//         }

//         let relation = [];

//         Promise.all(selectArticles.map(async (article) => {
//         let summaryQuery = `"main_article": ${main_article.title}, "keyword": [${keyword}]; "Selected": [${article.description}]`;
//         let summary_message = [
//             {
//             "role": "system",
//             "content": `You are an advanced and helpful news relationship classification system. 
//                         You will be given a main article starting with label "main_article", a keyword starting with label "keyword", and a JSON object starting after label "Selected", containing summary of a selected article.
//                         Your job is to classify whether two articles are related to each other regarding the "keyword". 
//                         Please give the response with true and false only, "true" if two articles are related with respect to keyword, "false" otherwise.`
//             },
//             {
//             "role": "user",
//             "content": summaryQuery
//             }
//         ];

//         try {
//             let relate = await fetch('/chat', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json'
//             },
//             body: JSON.stringify({ conversation: summary_message })
//             });

//             let relation_res = await relate.json();
//             console.log("LLM Classification for article:", article.title, "<--", relation_res.response, "-->", main_article.title);
//             relation.push(relation_res.response);
//         } catch (error) {
//             console.error('Error:', error);
//             throw error;
//         }
//         }))
//         .then(() => {
//             console.log('All articles processed.');
//             // Continue with further processing or use the 'relation' array as needed
//             selected_ind, selected_summaries = summarizer(relation, keyword, selectArticles);
//             return selected_ind, selected_summaries
//         })
//         .catch((error) => {
//             console.error('Error:', error);
//         });
        
//         const data = {"index": selected_ind, "summary": selected_summaries};
//         console.log('LLM Final Timeline: ', data);
//         return data;
//     } catch (error) {
//         alert('Oops, there is an error! :', error);
//         console.error('Error during chat:', error);
//         appendMessage('Error', 'Failed to fetch response.', 'error'); // Show error in chat history
//     }
// }


// async function summarizer(relation, keyword, selectArticles){
//     selected_ind = []
//     selected_summaries = []
//     // separately go through each article to avoid hallucination
//     for (const ind in relation) {
//         console.log('relationship: ', relation[ind].toLowerCase())
//         if (relation[ind].toLowerCase() == "true"){
//             let summaryQuery = `"keyword": [${keyword}]; "Selected": [${selectArticles[ind].content}]`; 
//             let summary_message = [{"role": "system", "content": `You are an advanced and helpful news summarization system. Your summarization should be 
//                     concise and without any redundant sentences such as "This article talks about...". 
//                     You will be given a keyword starting with label "keyword", and a JSON object starting after label "Selected", containing meatadata and content of a selected article.
//                     Your job is to concisely summarize the "Selected" article mentioning "keyword".
//                     Please give the response with one concise plain text summary of the "content" field for the "Selected" article given, following this example:
//                     "1 to 2 very concise sentences of at most 100 words summarizing for the Selected article with keyword"` },
//                     {"role": "user", "content": summaryQuery}];
//             let summaries = await fetch('/chat', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json'
//                 },
//                 body: JSON.stringify({conversation: summary_message})
//             });
//             let LLM_summary = await summaries.json();
//             console.log("LLM_summary for article: ", selectArticles[ind].title, " Summarization: ", LLM_summary.response);
//             LLM_summary = LLM_summary.response;
//             selected_summaries.push(LLM_summary);
//             selected_ind.push(nodup_ind[ind]);
//         }
//     }
//     return selected_ind, selected_summaries
// }