import express from 'express';
import cors from 'cors';
import simpleGit from 'simple-git';
import fs from 'fs-extra';
import path from 'path';
import dotenv from 'dotenv';
import { openai, supabase } from './config.js';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from "@langchain/openai";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";

dotenv.config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.post('/clone', async (req, res) => {
    const { repoLink, branch = 'main', workingDir = './cloned-repo' } = req.body;

    try {
        const cloneDir = path.resolve(workingDir);
        if (!fs.existsSync(cloneDir)) {
            fs.mkdirSync(cloneDir, { recursive: true });
        }

        console.log(`Cloning ${repoLink} (branch: ${branch}) into ${cloneDir}...`);
        const git = simpleGit();
        await git.clone(repoLink, cloneDir, ['--branch', branch, '--single-branch']);

        console.log(`Repository cloned successfully to: ${cloneDir}`);
        res.json({ message: `Repository cloned successfully into ${cloneDir}`, cloneDir });
    } catch (error) {
        console.error('Error cloning repository:', error.message);
        res.status(500).json({ error: error.message });
    }
});

const getAllFiles = (dir, extensions) => {
    let files = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            files = files.concat(getAllFiles(fullPath, extensions));
        } else if (extensions.some(ext => item.name.endsWith(ext))) {
            files.push(fullPath);
        }
    }
    return files;
};

app.post('/create-embeddings', async (req, res) => {
    const { directory } = req.body;

    if (!directory || !fs.existsSync(directory)) {
        return res.status(400).json({ error: 'Invalid or missing directory path.' });
    }

    try {
        const supportedExtensions = ['.txt', '.ex', '.svg', '.md', '.yml', '.py', '.js', '.html', '.css', '.jsx', '.cjs', '.exs', '.json'];
        const files = getAllFiles(directory, supportedExtensions);
        
        for (const file of files) {
            const text = fs.readFileSync(file, 'utf-8');
            const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
            const output = await splitter.createDocuments([text]);
            console.log(output);

            const embeddings = new OpenAIEmbeddings(openai);
            const vectorStore = await SupabaseVectorStore.fromDocuments(
                output.map(doc => ({ ...doc, metadata: { filename: path.basename(file) } })),
                embeddings,
                {
                    client: supabase,
                    tableName: 'git',
                    queryName: "match_git",
                }
            );
            console.log("Vector Store Updated", vectorStore);
        }

        res.json({ message: 'Embeddings created and stored successfully!' });
    } catch (error) {
        console.error('Error creating embeddings:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
