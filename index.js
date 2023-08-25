require('dotenv').config();
const axios = require('axios');
const { JSDOM } = require('jsdom');
const fs = require('fs');

const parseAssignments = async (cookieString) => {
    try {
        let response = await axios.get(`https://www.gradescope.com/account`, {
            headers: {
                'Cookie': cookieString
            }
        });

        if (response.status !== 200) {
            console.error(response);
            return;
        }

        const assignmentPageDOM = new JSDOM(response.data);
        fs.writeFileSync('./out.html', response.data);
        const courseLists = assignmentPageDOM.window.document.getElementsByClassName('courseList');
        const studentCourses = courseLists[courseLists.length - 1]; // Last entry is student courses, before that can potentially be instructor courses
        const courses = studentCourses.querySelector(`:scope > div[class='courseList--coursesForTerm']`);
        const courseURLs = courses.querySelectorAll(`:scope > a`).map((element) => element.getAttribute('href'));

        console.log(courseURLs);
    } catch (err) {
        console.error(err);
    }
}

const buildCookieString = (cookieArray) => {
    let cookieString = "";

    for (let cookie of cookieArray) {
        cookieString += cookie.substring(0, cookie.indexOf(';') + 1);
    }

    return cookieString;
}

const getCSRFTokenAndSession = async () => {
    try {
        let response = await axios.get(`https://www.gradescope.com/login`);

        if (response.status !== 200) {
            console.error(response);
            return;
        }

        const gradescopeDOM = new JSDOM(response.data);
        const CSRFToken = gradescopeDOM.window.document.querySelector(`input[name='authenticity_token']`).value;
        const gradescopeSessionCookies = buildCookieString(response.headers['set-cookie']);

        login(CSRFToken, gradescopeSessionCookies, process.env.GRADESCOPE_EMAIL, process.env.GRADESCOPE_PASSWORD);
    } catch (err) {
        console.error(err);
    }
}

const login = async (CSRFToken, gradescopeSessionCookies, email, password) => {
    try {
        let response = await axios.post(`https://www.gradescope.com/login`, {
            data: {
                'utf8': '✓',
                'authenticity_token': CSRFToken,
                'session[email]': email,
                'session[password]': password,
                'session[remember_me]': 0,
                'commit': 'Log In',
                'session[remember_me_sso]': 0,
            },
            headers: {
                'Cookie': gradescopeSessionCookies
            }
        });

        if (response.status !== 200) {
            console.error(response);
            return;
        }

        const sessionCookies = buildCookieString(response.headers['set-cookie']);
        parseAssignments(sessionCookies);
    } catch (err) {
        console.error(err);
    }
}

getCSRFTokenAndSession();