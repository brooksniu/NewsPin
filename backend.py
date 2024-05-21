from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import openai
import os
from openai import OpenAI

app = Flask(__name__, static_folder='./')
CORS(app)

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/chat', methods=['POST'])
def chat():
    client = OpenAI(api_key='')
    conversation = request.json['conversation']
    completion = client.chat.completions.create(
        model="gpt-3.5-turbo",
        temperature=0.0,
        messages=conversation
    )
    return jsonify({"response": completion.choices[0].message.content})

# 如果前端文件在特定目录中
@app.route('/<path:path>')
def static_file(path):
    return send_from_directory(app.static_folder, path)

if __name__ == '__main__':
    app.run(debug=True, use_reloader=True)