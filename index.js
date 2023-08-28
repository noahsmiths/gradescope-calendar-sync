require('dotenv').config();
const Gradescope = require('./src/utils/Gradescope');

(async () => {

try {
    const session = new Gradescope(process.env.GRADESCOPE_EMAIL, process.env.GRADESCOPE_PASSWORD);
    await session.login();
    let assignments = await session.getAssignments();
    console.log(JSON.stringify(assignments));
} catch (err) {
    console.error(err);
}

})();