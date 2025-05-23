import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
import instaloader
import os
import time
import requests
from flask import jsonify, Response
from collections import deque

USERNAME = "your_username_here"
SESSION_FILE = f"{USERNAME}.session"
L = instaloader.Instaloader()

# Load session if exists
if os.path.exists(SESSION_FILE):
    try:
        L.load_session_from_file(USERNAME)
    except Exception as e:
        print(f"Session load error: {e}")

def get_profile_data(username):
    try:
        profile = instaloader.Profile.from_username(L.context, username)
        time.sleep(5)  # Avoid rate limit
        return jsonify({
            "username": profile.username,
            "full_name": profile.full_name,
            "followers": profile.followers,
            "following": profile.followees,
            "bio": profile.biography,
            "profile_pic_url": profile.profile_pic_url,
            "total_posts": profile.mediacount
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 404

def download_profile_pic(url):
    try:
        resp = requests.get(url, stream=True)
        return Response(resp.iter_content(10240), content_type=resp.headers['Content-Type'])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def analyze_profiles(data):
    profiles = data.get("profiles", [])
    follows = data.get("follows", {})
    algorithm = data.get("algorithm", "BFS")

    if not profiles:
        return jsonify({"error": "No profiles provided"}), 400

    profile_map = {p["username"]: p for p in profiles}
    graph = {u: follows.get(u, []) for u in profile_map}
    visited = set()
    ranked = []

    def bfs(start):
        q = deque([start])
        visited.add(start)
        while q:
            node = q.popleft()
            ranked.append(node)
            for neighbor in graph.get(node, []):
                if neighbor not in visited:
                    visited.add(neighbor)
                    q.append(neighbor)

    def dfs(node):
        visited.add(node)
        ranked.append(node)
        for neighbor in graph.get(node, []):
            if neighbor not in visited:
                dfs(neighbor)

    start_user = profiles[0]["username"]
    if algorithm == "DFS":
        dfs(start_user)
    else:
        bfs(start_user)

    scored = []
    for uname in ranked:
        p = profile_map[uname]
        p["score"] = p["followers"] + p["total_posts"]
        scored.append(p)

    scored.sort(key=lambda x: x["score"], reverse=True)
    return jsonify(scored)

DB_FILE = 'users.db'

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()
    # Add 'dob' field to your users table if you want to store it
    cur.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        dob TEXT
    )''')
    conn.commit()
    conn.close()

def register_user(username, password, dob):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE username=?", (username,))
    if c.fetchone():
        conn.close()
        return "Username already exists."
    hashed_password = generate_password_hash(password)
    c.execute("INSERT INTO users (username, password, dob) VALUES (?, ?, ?)", (username, hashed_password, dob))
    conn.commit()
    conn.close()
    return "Registration successful. Please login."

def login_user(username, password):
    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()
    cur.execute("SELECT password FROM users WHERE username = ?", (username,))
    row = cur.fetchone()
    conn.close()
    if row and check_password_hash(row[0], password):
        return True
    return False
