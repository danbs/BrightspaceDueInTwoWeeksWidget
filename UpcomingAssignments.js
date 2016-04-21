/*
Program/Project: Upcoming Assignments widget for brightspace

Name: Robert Taft, Axan Similien, Kevin Berrio, Bryson Jolley

Date: 3/26/2016

Description: Displays the upcoming assigments for a students course

Instructor: Dan Masterson Section: CS260 01
 */


// <![CDATA[
/*
Description:This function controls the process of retrieving the topics and displaying the topics due in the next two weeks
Pre-Conditions: The page has loaded
Post-Conditions: The topics due in the next two weeks are displayed in the widget
*/
$(document).ready(function () {
    var currentCourseID = getCurrentCourseID();
    var versionNumber = "1.5";
    //When getTableOfContentCall deferred ajax call is resolved
    $.when(getTableOfContentsCall(currentCourseID, versionNumber)).done(function (tableOfContentsArray) {
        var topicIDsArray = getAllTopicIDs(tableOfContentsArray);
        var topicAjaxCallsArray = getAllTopicAjaxCalls(topicIDsArray, currentCourseID, versionNumber);
        //When.apply converts an array into seperate function calls for each deferred object into an array
        $.when.apply($, topicAjaxCallsArray).done(function () {
            //arguments is the result from all the ajax calls completed in the when statement
            var topicsDueInTwoWeeks = getAllTopicsDueInTwoWeeks(topicIDsArray, arguments);
            //If there are topics that are due in two weeks
            if (topicsDueInTwoWeeks.length > 0) {
                topicsDueInTwoWeeks = sortDueDates(topicsDueInTwoWeeks);
                displayTopics(topicsDueInTwoWeeks);
            }
            //If there aren't topics that are due in two weeks
            else {
                $('p').empty();
                $('p').append("You have no upcoming assignments");
            }
        });

    });

});

/*
Description: This function gets the url of the parent window to find out the users current course Id
Pre-conditions: The page the widget is on is loaded
Post-condtions: The current course ID is returned
*/
function getCurrentCourseID() {
    return ((parent.window.location.href).split("/"))[5];
}

/*
Description: This function returns the ajax call needed to get the table of contents for the current course
Pre-conditions: The current course ID is needed, we also need the current version of the API
Post-condtions: This returns the deferred ajax call object to get the table of contents for the current course
*/
function getTableOfContentsCall(currentCourseID, versionNumber) {
    return $.ajax('/d2l/api/le/' + versionNumber + '/' + currentCourseID + '/content/toc', {
        dataType: 'json',
        headers: { 'X-Csrf-Token': localStorage['XSRF.Token'] }
    });
}

/*
Description: This function iterates through a courses table of contents to retrieve all the topic IDs and titles for the course
Pre-conditions: An array of JSON objects returned as a result of making an AJAX call to retrieve a courses table of contents
Post-condtions: An array of objects that have a property for a Topics Id, and a property for a Topics Title
*/
function getAllTopicIDs(tableOfContentsArray) {
    var topicIDsArray = [];
    var i = 0;
    //Iterates through all of the modules in the table of contents
    while (i < tableOfContentsArray.Modules.length) {
        modulesTopicIDsArray = getModulesTopicIDs(tableOfContentsArray.Modules[i])
        var j = 0;
        while (j < modulesTopicIDsArray.length) {
            topicIDsArray.push(modulesTopicIDsArray[j]);
            j++;
        }
        i++;
    }
    return topicIDsArray;
}

/*
Description: This function iterates through a single module's topics and any child modules to get their topics
Pre-conditions: An object representing a module of a course from the courses table of contents
Post-condtions: An array of topic objects for all topics in this module and child modules
*/
function getModulesTopicIDs(module) {
    var modulesTopicIDsArray = [];
    var i = 0;
    //stores each of the modules topics
    while (i < module.Topics.length) {
        var topicObject = { Id: module.Topics[i].TopicId, Title: module.Topics[i].Title }
        modulesTopicIDsArray.push(topicObject);
        i++
    }
    i = 0;
    //iterates through each of the modules child modules to get their topcis by recursively calling this function over and over
    while (i < module.Modules.length) {
        var childModulesTopicIDsArray = getModulesTopicIDs(module.Modules[i]);
        var j = 0;
        while (j < childModulesTopicIDsArray.length) {
            modulesTopicIDsArray.push(childModulesTopicIDsArray[j])
            j++
        }
        i++;
    }
    return modulesTopicIDsArray;
}

/*
Description: This function creates an array of deferred ajax calls for each topic
Pre-conditions: An array that has the IDs for all the courses topics, the current course id, and the current version number of the API
Post-condtions: An array of deferred ajax calls are returned for each topic
*/
function getAllTopicAjaxCalls(topicIDsArray, currentCourseID, versionNumber) {
    var topicAjaxCallsArray = [];
    for (var i = 0; i < topicIDsArray.length; i++) {
        topicAjaxCallsArray.push($.ajax('/d2l/api/le/' + versionNumber + '/' + currentCourseID + '/content/topics/' + topicIDsArray[i].Id, {
            dataType: 'json',
            headers: { 'X-Csrf-Token': localStorage['XSRF.Token'] }
        }));
    }
    return topicAjaxCallsArray;
}

/*
Description: This function iterates through all of the topics due dates to see if they are due within the next two weeks
Pre-conditions: An array of all the topic IDs and titles, an array-like structure that has the results of making an ajax call for each topic
Post-condtions: An array of all topics due in the next two weeks, each object in the array will include a title, a url, and the due date
*/
function getAllTopicsDueInTwoWeeks(topicIDsArray, topicsArray) {
    var topicsDueInTwoWeeks = [];
    var todaysDate = new Date();
    var twoWeeksDate = new Date();
    twoWeeksDate.setDate(twoWeeksDate.getDate() + 14);
    var i = 0;
    while (i < topicsArray.length) {
        if (topicsArray[i][0].DueDate != null) {
            var dueDateLocalTime = new Date(topicsArray[i][0].DueDate);
            if (dueDateLocalTime <= twoWeeksDate && dueDateLocalTime >= todaysDate) {
                topicsDueInTwoWeeks.push({
                    //I use the title from this array because the title from a topic id ajax call is usually a url
                    //This is a known issue on brightspace
                    Title: topicIDsArray[i].Title,
                    Url: topicsArray[i][0].Url,
                    DueDate: dueDateLocalTime
                })
            }
        }
        i++;
    }
    return topicsDueInTwoWeeks;
}

/*
Description: This function will sort the topics due dates
Pre-conditions:
Post-condtions:
*/
function sortDueDates(topicsDueInTwoWeeks) {
    return topicsDueInTwoWeeks.sort(function (a, b) {
        return (a.DueDate).getTime() - (b.DueDate).getTime();
    })
}

function displayTopics(topicsDueInTwoWeeks) {
    $('p').remove();
    var myArray = [];
    for (var i = 0; i < topicsDueInTwoWeeks.length; i++) {
        //This will create the documents that we need in the HTML
        var assignments = document.createElement("div");
        var title = document.createElement("span");
        var date = document.createElement("span");
        
        var link = document.createElement("a");
        
        //This link receives the url to go to the HW
        link.setAttribute("href", topicsDueInTwoWeeks[i].Url);
        link.setAttribute("target", "_top");
        date.setAttribute("class", "date");
        
        //We append the child nodes with their respective parents
        title.innerHTML = topicsDueInTwoWeeks[i].Title;
        date.innerHTML = timeDateFormatter(topicsDueInTwoWeeks[i].DueDate);
        link.appendChild(title);
        assignments.appendChild(link);
        
        assignments.appendChild(date);
        if (i % 2 == 0)
            assignments.setAttribute("class", "even");

        else {
            
            assignments.setAttribute("class", "odd");

        }
        //Push the elements
        myArray.push(assignments);
    }
    
    
    
    for (var j = 0; j < myArray.length; j++) {
        document.body.appendChild(myArray[j]);
    }

}

/*
Description: This function will format a date object to return data object that is readable
Pre-conditions: A date object
Post-condtions: A string that looks like this "mon 4/11 11:59 P.M."
*/
function timeDateFormatter(dueDate) {
    var dayOfWeek = ((dueDate.toDateString()).split(" "))[0];
    var dateArray = ((dueDate.toLocaleDateString()).split("/"));
    var monthAndDay = dateArray[0] + "/" + dateArray[1];
    var timeArray = ((dueDate.toLocaleTimeString()).split(":"));
    var amPM = (timeArray[2].split(" "))[1];
    var time = timeArray[0] + ":" + timeArray[1] + " " + amPM;
    var dueDate = dayOfWeek + " " + monthAndDay + " " + time;
    return dueDate;
}
// ]]>