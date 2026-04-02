// api/add-product.js
// Vercel Serverless Function — adds a product to the repo via GitHub API

const { Octokit } = require("@octokit/rest");

const OWNER = process.env.GITHUB_REPO_OWNER;   // e.g. "your-github-username"
const REPO  = process.env.GITHUB_REPO_NAME;    // e.g. "kashmir-gems"
const BRANCH = process.env.GITHUB_BRANCH || "main";

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { name, price, category, description, imageBase64, imageExtension } = req.body;

  if (!name || !price || !category || !imageBase64) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token || !OWNER || !REPO) {
    return res.status(500).json({ error: "Server misconfiguration: missing GitHub env vars." });
  }

  const octokit = new Octokit({ auth: token });

  try {
    // ── 1. Upload image to public/images/ ─────────────────────────────────────
    const timestamp = Date.now();
    const ext = imageExtension || "jpg";
    const imagePath = `public/images/${timestamp}.${ext}`;
    const imageContent = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    await octokit.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path: imagePath,
      message: `feat: add product image for "${name}"`,
      content: imageContent,
      branch: BRANCH,
    });

    const imageUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${imagePath}`;

    // ── 2. Fetch current products.json ────────────────────────────────────────
    const { data: fileData } = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: "data/products.json",
      ref: BRANCH,
    });

    const currentContent = Buffer.from(fileData.content, "base64").toString("utf8");
    const products = JSON.parse(currentContent);

    // ── 3. Append new product ─────────────────────────────────────────────────
    const newProduct = {
      id: `prod_${timestamp}`,
      name,
      price: parseFloat(price),
      category,
      description: description || "",
      image: imageUrl,
    };
    products.push(newProduct);

    // ── 4. Commit updated products.json ───────────────────────────────────────
    const updatedContent = Buffer.from(JSON.stringify(products, null, 2)).toString("base64");

    await octokit.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path: "data/products.json",
      message: `feat: add product "${name}"`,
      content: updatedContent,
      sha: fileData.sha,       // required for updates
      branch: BRANCH,
    });

    return res.status(200).json({ success: true, product: newProduct });
  } catch (err) {
    console.error("add-product error:", err);
    return res.status(500).json({ error: err.message || "Internal server error." });
  }
};
