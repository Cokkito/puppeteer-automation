const puppeteer = require('puppeteer');
const config = require('./config');

// If you wish to change the number of ranodm tasks to add, change this number
const NUMBER_OF_TASKS_TO_ADD = 5;

// Choose random page from the randomtodolistgenerator
const getRandomPage = async page => {
  return await page.evaluate(() => {
    const pageNumberElementsArray = document.querySelectorAll('.page-item div span');
    let randomPageNumber = Math.floor(Math.random() * pageNumberElementsArray.length);

    // Prevent interaction with previous/next page button
    while(randomPageNumber === 0 || randomPageNumber === pageNumberElementsArray.length) {
      randomPageNumber = Math.floor(Math.random() * pageNumberElementsArray.length);
    }

    return randomPageNumber;
  });
};

// Get all tasks from current page
const getTasksFromCurrentPage = async page => {
  return await page.evaluate(() => {
    const taskContainers = document.querySelectorAll('.card-body');
    const tasks = [];

    taskContainers.forEach(taskContainer => {
      tasks.push({
        title: taskContainer.getElementsByClassName('flexbox task-title')[0].firstElementChild.innerHTML,
        description: taskContainer.getElementsByClassName('card-text')[0].textContent
      });
    })

    return tasks;
  });
};

// Pick a random task from the retrieved list
const pickRandomTaskFromList = taskList => taskList[Math.floor(Math.random() * taskList.length)];

// Write all the tasks from the list into your https://todoist.com account
const setTasks = async (page, taskList) => {
  for (let i = 0; i < taskList.length; i++) {
    await page.click('div[class="richtextinput"]', {delay: 10});
    await page.keyboard.type(taskList[i].title, {delay: 10});
    await page.type('textarea[class="task_editor__description_field no-focus-marker"]', taskList[i].description, {delay: 10});

    await page.click('button[class="reactist_button reactist_button--primary"]', {delay: 10});
  }
};

(async () => {
  const browser = await puppeteer.launch({headless: false, defaultViewport: null, args: ['--start-maximized'] });
  const page = await browser.newPage();
  await page.goto('https://randomtodolistgenerator.herokuapp.com/library');
  await page.waitForSelector('.page-item');

  let pageNumber;
  const randomTasksList = [];
  
  // Pick N number of random tasks from randomtodolistgenerator
  for (let i = 0; i < NUMBER_OF_TASKS_TO_ADD; i++) {
    pageNumber = await getRandomPage(page);

    await page.click(`#section-to-print > div.row.mt-3.page-nav > div > nav > ul > li:nth-child(${pageNumber}) > div > span`, {delay: 1000});

    const pageTasksList = await getTasksFromCurrentPage(page);

    const randomTask = pickRandomTaskFromList(pageTasksList);

    randomTasksList.push(randomTask);
  }

  await page.waitForTimeout('1000');

  // Go to todoist.com
  await page.goto('https://todoist.com')
  await page.waitForSelector('._3XsmI');
  await page.click('ul[class="_3XsmI"] li');

  // Login
  await page.waitForSelector('#login_form');
  await page.type('input#email.input.input_email', config.email, {delay: 10});
  await page.type('input#password.form_field_control', config.password, {delay: 10});
  await page.click('button[class="submit_btn ist_button ist_button_red sel_login"]');

  // Open add task form
  await page.waitForSelector('.plus_add_button');
  await page.waitForTimeout(1000);
  await page.click('button[class="plus_add_button"]');
  await page.waitForSelector('.richtextinput');

  // Set random tasks from randomtodolistgenerator
  await setTasks(page, randomTasksList);

  // Leave the page open for some seconds before closing it
  await page.waitForTimeout(3000);
  await browser.close()
})();