from flask import Flask, render_template, request, redirect, session, url_for, jsonify
from insta_utils import get_profile_data, download_profile_pic, analyze_profiles, init_db, register_user, login_user
import os

app = Flask(__name__)
app.secret_key = 'supersecretkey'  # Use environment variable in production

init_db()  # Ensure DB and users table exist

@app.route('/', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        action = request.form['action']

        if action == 'Register':
            confirm_password = request.form.get('confirm_password')
            dob = request.form.get('dob')
            if password != confirm_password:
                return render_template('login.html', message="Passwords do not match.")
            if not dob:
                return render_template('login.html', message="Date of Birth is required.")
            msg = register_user(username, password, dob)
            return render_template('login.html', message=msg)
        else:
            if login_user(username, password):
                session['user'] = username
                return redirect(url_for('index'))
            return render_template('login.html', message="Invalid credentials.")
    return render_template('login.html')


@app.route('/home')
def index():
    if 'user' not in session:
        return redirect(url_for('login'))
    return render_template("index.html", user=session['user'])

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/search')
def search():
    if 'user' not in session:
        return redirect(url_for('login'))
    username = request.args.get('q')
    return get_profile_data(username)

@app.route('/profile_pic')
def profile_pic():
    return download_profile_pic(request.args.get("url"))

@app.route('/analyze', methods=['POST'])
def analyze():
    return analyze_profiles(request.get_json())

if __name__ == '__main__':
    app.run(debug=True)
