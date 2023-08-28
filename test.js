require('dotenv').config();
const request = require('request').defaults({
    jar: true,
    headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36"
    }
});
const { JSDOM } = require('jsdom');
const fs = require('fs');

request({
    method: "GET",
    url: "https://www.gradescope.com/",
}, (e, r, b) => {
    if (r.statusCode !== 200) {
        console.error(r.statusCode);
        return;
    }

    const gradescopeDOM = new JSDOM(r.body);
    const CSRFToken = gradescopeDOM.window.document.querySelector(`input[name='authenticity_token']`).getAttribute('value');

    request({
        method: "POST",
        url: "https://www.gradescope.com/login",
        form: {
            'utf8': '✓',
            'authenticity_token': CSRFToken,
            'session[email]': process.env.GRADESCOPE_EMAIL,
            'session[password]': process.env.GRADESCOPE_PASSWORD,
            'session[remember_me]': 0,
            'commit': 'Log In',
            'session[remember_me_sso]': 0,
        },
        followAllRedirects: true
    }, (e, r, b) => {
        console.log(r.headers);
        fs.writeFileSync("./out.html", r.body);
    });
});