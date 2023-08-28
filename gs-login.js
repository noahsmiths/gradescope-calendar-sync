require('dotenv').config();
const { JSDOM } = require('jsdom');
const fs = require('fs');
const request = require('request-promise').defaults({
    headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36"
    },
    baseUrl: 'https://www.gradescope.com/',
    resolveWithFullResponse: true
});

const parseAssignments = (courseURL, gradescopeSession) => {
    return new Promise(async (res, rej) => {
        try {
            let response = await request({
                method: 'GET',
                url: courseURL,
                jar: gradescopeSession
            });

            if (response.statusCode !== 200) {
                rej(response);
            }

            fs.writeFileSync('./out.html', response.body);

            const assignmentPageDOM = new JSDOM(response.body);
            const assignmentTableRows = assignmentPageDOM.window.document.querySelectorAll('#assignments-student-table > tbody > tr');
            const assignments = [...assignmentTableRows].map((element) => {
                return {
                    name: element.childNodes[0].childNodes[0].textContent, // string
                    link: element.childNodes[0].childNodes[0].getAttribute('href'), // assignment link
                    dueAt: element.querySelector(`:scope .submissionTimeChart--dueDate`).getAttribute('datetime') // string timestamp
                }
            });

            res(assignments);
        } catch (err) {
            rej(err);
        }
    });
}

const parseCourses = async (gradescopePageHTML, gradescopeSession) => {
    try {
        // let response = await axios.get(`https://www.gradescope.com/account`, {
        //     jar: gradescopeSession
        // });

        // if (response.statusCode !== 200) {
        //     console.error(response);
        //     return;
        // }

        // const assignmentPageDOM = new JSDOM(response.data);
        const coursePageDOM = new JSDOM(gradescopePageHTML);
        // fs.writeFileSync('./out.html', response.data);
        const courseLists = coursePageDOM.window.document.getElementsByClassName('courseList');
        const studentCourses = courseLists[courseLists.length - 1]; // Last entry is student courses, before that can potentially be instructor courses
        const courses = studentCourses.querySelector(`:scope > div[class='courseList--coursesForTerm']`);
        const courseURLs = [...courses.querySelectorAll(`:scope > a`)].map((element) => element.getAttribute('href'));

        for (let courseURL of courseURLs) {
            let assignments = await parseAssignments(courseURL, gradescopeSession);
            console.log(new Date(assignments[0].dueAt));
        }

        // console.log(courseURLs);
    } catch (err) {
        console.error(err);
    }
}

const getCSRFTokenAndSession = async () => {
    try {
        let gradescopeSession = request.jar();
        let response = await request({
            method: 'GET',
            url: `/`,
            jar: gradescopeSession
        });

        if (response.statusCode !== 200) {
            console.error(response);
            return;
        }

        const gradescopeDOM = new JSDOM(response.body);
        const CSRFToken = gradescopeDOM.window.document.querySelector(`input[name='authenticity_token']`).getAttribute('value');

        login(CSRFToken, gradescopeSession, process.env.GRADESCOPE_EMAIL, process.env.GRADESCOPE_PASSWORD);
    } catch (err) {
        console.error(err);
    }
}

const login = async (CSRFToken, gradescopeSession, email, password) => {
    try {
        let response = await request({
            method: 'POST',
            url: `/login`,
            form: {
                'utf8': '✓',
                'authenticity_token': CSRFToken,
                'session[email]': email,
                'session[password]': password,
                'session[remember_me]': 0,
                'commit': 'Log In',
                'session[remember_me_sso]': 0,
            },
            followAllRedirects: true,
            jar: gradescopeSession,
        });

        if (response.statusCode !== 200) {
            console.error(response);
            return;
        }

        try {
            if (Object.keys(gradescopeSession._jar.store.idx['www.gradescope.com']['/']).length <= 1) {
                console.error("Not enough cookies detected when logging in. There should be more than 1 on a successful login attempt.");
                return;
            }
        } catch (err) {
            console.error("Error parsing cookies from request jar.");
            return;
        }
        
        parseCourses(response.body, gradescopeSession);
    } catch (err) {
        console.error(err);
    }
}

getCSRFTokenAndSession();