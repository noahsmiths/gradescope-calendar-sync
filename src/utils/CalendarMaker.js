const { ICalCalendar } = require('ical-generator');

class CalendarMaker {
    static generateFromGradescope(courses) {
        const calendar = new ICalCalendar();

        for (let course of courses) {
            for (let assignment of course.assignments) {
                calendar.createEvent({
                    start: new Date(assignment.dueAt),
                    summary: `${assignment.name} - ${course.courseName}`,
                    location: `https://www.gradescope.com${assignment.link || ""}`
                });
            }
        }

        return calendar;
    }
}

module.exports = CalendarMaker;