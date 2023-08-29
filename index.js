require('dotenv').config();
const Gradescope = require('./src/utils/Gradescope');
const CalendarMaker = require('./src/utils/CalendarMaker');
const fs = require('fs');

(async () => {

try {
    const session = new Gradescope(process.env.GRADESCOPE_EMAIL, process.env.GRADESCOPE_PASSWORD);
    await session.login();
    let assignments = await session.getAssignments();
    // console.log(JSON.stringify(assignments));
    fs.writeFileSync('./calendar.ics', CalendarMaker.generateFromGradescope(assignments).toString());

} catch (err) {
    console.error(err);
}

})();