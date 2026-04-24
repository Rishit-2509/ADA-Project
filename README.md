# ADA-Project
Project on Plagiarism Checker
Key Features

Multi-Document Analysis

* Supports comparison between multiple documents simultaneously
* Automatically generates all possible document pairs for analysis

LCS-Based Plagiarism Detection

* Uses **Longest Common Subsequence (LCS)** algorithm for accurate similarity detection
* Identifies ordered matching content between documents

Similarity Scoring

* Provides a clear **similarity percentage** for each document pair
* Classifies results into intuitive categories (e.g., high/moderate similarity)

Highlighted Comparison

* Displays **matched (similar)** and **unmatched (dissimilar)** content visually
* Makes it easy to understand overlap between documents

Efficient Frontend Implementation

* Fully client-side (no backend required)
* Fast processing using optimized JavaScript logic

Flexible File Input

* Supports multiple file formats: `.txt`, `.md`, `.html`, `.csv`
* Includes drag-and-drop file upload functionality

Clean & Modular Code Structure

* Well-organized functions (tokenization, LCS, similarity computation)
* Easy to maintain and extend

Safe Rendering

* Escapes HTML content before rendering
* Prevents XSS (Cross-Site Scripting) vulnerabilities

User-Friendly Interface

* Simple and intuitive UI
* Clear results presentation with minimal user effort

Configurable Logic (Extendable)

* Thresholds (e.g., similarity percentage) can be easily adjusted
* Can be extended with advanced algorithms (cosine similarity, hashing, etc.)


