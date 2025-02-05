# Personal AI Git Chat Agent

## Introduction
This project is a Chat AI Agent that helps to understand your private codebase.
1) It creates embeddings of the git files and uploads its vector on supabase which is an opensource DB. SUpabase can be spinned locally using docker. Your private github data remains private. This project is way more personalized and is better performing than copilot in certain aspects since it has more context which we have recorded in the video


https://github.com/user-attachments/assets/b8ce8a38-d5ce-4157-b28c-f227e52096d8


## Installation
1. Use npm to install all dependencies specified in package.json

2. Keep API keys of supabase and openai ready

3. Start the server:
    ```bash
    node server.js
    ```
4. Start the vite app:
    ```bash
    npm run dev
    ```
5. In the UI, provide git details where it clones local, produces embeddings and stores vector in supabase. Post successful embedding creation, you can start the personalised assistant chat.

## Contributing
Feel free to submit issues and pull requests. For major changes, please open an issue first to discuss what you would like to change.
