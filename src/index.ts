import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { prettyJSON } from "hono/pretty-json";

import puppeteer from 'puppeteer'

import fs, { readFileSync } from 'node:fs'
import { json } from 'node:stream/consumers';

const jsdom = require("jsdom")
const {JSDOM} = jsdom
const app = new Hono()
app.use("*", prettyJSON());

const path = '../html'
app.get('/', (c) => {
  return c.html(`<a href="/json">jsonの閲覧</a>`)
})
app.get('/json', async (c) => {
  // puppeteerでの初期化
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/local')
  const html = await page.$eval("#tablefix1", (e) => e.outerHTML);

  //jsdomでdom操作
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const coll = document.querySelector("#tablefix1").getElementsByTagName("tr")

  //textContentをjsonにする
  const format_json = []
  for (let i = 3; i < coll.length; i++) {
    const data = [...coll[i].getElementsByTagName("td")]
    let arr = []
    for (let j = 0; j < 7; j++){
      arr.push(data[j].textContent)
    }
    const json = {
      "day": arr[0],
      "precipitation": {
          "total": arr[1],
          "max_1h": arr[2],
          "max_10min": arr[3]
      },

      "temperature": {
          "average": arr[4],
          "max": arr[5],
          "min": arr[6]
      }
    }
    format_json.push(json)
  }

  await browser.close();

  // return c.text("home")
  return c.json(format_json)
})

app.get('/local', (c) => {
  const htmlContent = readFileSync(`${path}/index.html`, 'utf-8')
  return c.html(htmlContent)
})

app.get('/get', async (c) => {
  const url = 'https://www.data.jma.go.jp/stats/etrn/view/daily_a1.php?prec_no=63&block_no=0614&year=2023&month=6&day=&view=p1'

  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, {recursive: true})
  }

  const browser = await puppeteer.launch({headless: false});
  const page = await browser.newPage();
  await page.goto(url)
  // await page.goto('https://zenn.dev/saitoeku3/articles/save-web-page-with-puppeteer', { waitUntil: 'networkidle2' })

  const html = await page.content()
  fs.writeFileSync(`${path}/index.html`, html)
  console.log(html)
  await browser.close();
    
  return c.text('Hello Hono!')
})


const port = 3000
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})
