const rp = require('request-promise');
const { JSDOM } = require('jsdom');

class Gradescope {
    #accountPageDOM;
    #client;
    #courseURLs;
    #gradescopeEmail;
    #gradescopePassword;
    #loggedIn;

    constructor(email, password) {
        this.#gradescopeEmail = email;
        this.#gradescopePassword = password;
        this.#client = rp.defaults({
            headers: {
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36"
            },
            baseUrl: 'https://www.gradescope.com/',
            resolveWithFullResponse: true,
            jar: true
        });

        this.#loggedIn = false;
        this.#accountPageDOM;
        this.#courseURLs;
    }

    login() {
        return new Promise(async (res, rej) => {
            let authToken;

            try {
                authToken = await this.#getAuthToken();
            } catch (error) {
                rej(error);
            }

            try {
                let response = await this.#client({
                    method: 'POST',
                    url: `/login`,
                    form: {
                        'utf8': '✓',
                        'authenticity_token': authToken,
                        'session[email]': this.#gradescopeEmail,
                        'session[password]': this.#gradescopePassword,
                        'session[remember_me]': 0,
                        'commit': 'Log In',
                        'session[remember_me_sso]': 0,
                    },
                    followAllRedirects: true,
                });
        
                if (response.statusCode !== 200) {
                    throw new Error(response);
                }

                if (!response.body.includes("Your Courses")) { // Your Courses is just a simple string to search for, could be changed to something else also shown on the dashboard
                    throw new Error("Insuccessful login returned from Gradescope. Check email and password.");
                }
                
                this.#accountPageDOM = new JSDOM(response.body);
                this.#loggedIn = true;
                res();
            } catch (err) {
                rej({
                    msg: "Error logging into Gradescope and getting classes.",
                    error: err
                });
            }
        });
    }

    #getAuthToken() {
        return new Promise(async (res, rej) => {
            try {
                let response = await this.#client({
                    method: 'GET',
                    url: `/`,
                });
    
                if (response.statusCode !== 200) {
                    throw new Error(response);
                }
    
                const gradescopeDOM = new JSDOM(response.body);
                const authToken = gradescopeDOM.window.document.querySelector(`input[name='authenticity_token']`).getAttribute('value');

                res(authToken);
            } catch (err) {
                rej({
                    msg: "Error getting Gradescope session.",
                    error: err
                });
            }
        });
    }

    #parseCourses() {
        return new Promise((res, rej) => {
            try {
                const courseLists = this.#accountPageDOM.window.document.getElementsByClassName('courseList');
                const studentCourses = courseLists[courseLists.length - 1]; // Last entry is student courses, before that can potentially be instructor courses
                const courses = studentCourses.querySelector(`:scope > div[class='courseList--coursesForTerm']`);
                this.#courseURLs = [...courses.querySelectorAll(`:scope > a`)].map((element) => element.getAttribute('href'));

                res();
            } catch (err) {
                rej({
                    msg: "Error parsing courses.",
                    error: err
                });
            }
        });
    }

    #parseAssignments(courseURL) {
        return new Promise(async (res, rej) => {
            try {
                let response = await this.#client({
                    method: 'GET',
                    url: courseURL,
                });
    
                if (response.statusCode !== 200) {
                    throw new Error(response);
                }

                const coursePageDOM = new JSDOM(response.body);
                const courseName = coursePageDOM.window.document.querySelector('.courseHeader--title').textContent;
                const assignmentTableRows = coursePageDOM.window.document.querySelectorAll('#assignments-student-table > tbody > tr');
                const assignments = [...assignmentTableRows].map((element) => {
                    return {
                        name: element.childNodes[0].childNodes[0].textContent, // string
                        link: element.childNodes[0].childNodes[0].getAttribute('href'), // assignment link
                        dueAt: element.querySelector(':scope .submissionTimeChart--dueDate').getAttribute('datetime') // string timestamp
                    }
                });
    
                res({ courseName, assignments });
            } catch (err) {
                rej({
                    msg: `Error getting or parsing specific course data for ${courseURL}`,
                    error: err
                });
            }
        });
    }

    getAssignments() {
        return new Promise(async (res, rej) => {
            if (!this.#loggedIn) {
                rej("Not logged into Gradescope. Must call the login() method first.");
            }

            try {
                await this.#parseCourses();
            } catch (error) {
                rej(error);
            }

            try {
                let allCourseAssignments = [];
                for (let courseURL of this.#courseURLs) {
                    let courseData = await this.#parseAssignments(courseURL);
                    allCourseAssignments.push(courseData);
                }
    
                res(allCourseAssignments);
            } catch (error) {
                rej(error);
            }
        });
    }
}

module.exports = Gradescope;