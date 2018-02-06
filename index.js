const puppeteer = require('puppeteer');
const fs = require('fs');
const createCollage = require("photo-collage");

// Parse example/index.html
const path = process.argv[1] + '/examples/index.html';
const data = fs.readFileSync(path, 'utf8');

const examples = data.split("href=\'./").map((u) => {
  const end = u.indexOf("'", 0);
  return u.slice(0, end);
});

const examplesImage = [];

(async () => {
  const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});

  for (const example of examples.slice(1)) {
    const page = await browser.newPage();
    page.setViewport({ width: 400, height: 300 });
    process.stdout.write(`Loading ${example} `);
    await page.goto(`http://localhost:8080/examples/${example}`);
    process.stdout.write('.')
    // Get the "viewport" of the page, as reported by the page.
    const res = await page.evaluate(() => {
      function resolveOnLoad(x) {
        return new Promise(resolve => {
          function getView(promise) {
            if (typeof(view) === 'object') {
              return promise ? promise.resolve(view) : Promise.resolve(view);
            }
            if (typeof(globeView) === 'object') {
              return promise ? promise.resolve(globeView) : Promise.resolve(globeView);
            }

            const p = new Promise((rrr) => {
              this.resolve = rrr;
            });
            setTimeout(() => { getView(p) }, 100);
            return p;
          }
          // setup default timeout
          setTimeout(() => { resolve(false); }, 120000);
          getView().then((v) => {
            v.mainLoop.addEventListener('command-queue-empty', () => {
              resolve(true);
          })});
        });
      }

      return resolveOnLoad();
    });
    process.stdout.write('.')

    if (!res) {
      process.stdout.write('☠')      
    }

    await page.screenshot({path: example.replace('html', 'png')});
    examplesImage.push(example.replace('html', 'png'));
    process.stdout.write(`. wrote ${example.replace('html', 'png')}\n`);
  }

  await browser.close();

  const options = {
    sources: examplesImage,
    width: 3,
    height: Math.ceil(examplesImage.length / 3),
    imageWidth: 400,
    imageHeight: 300,
    spacing: 2,
  };
   
  createCollage(options)
    .then((canvas) => {
      const src = canvas.jpegStream();
      const dest = fs.createWriteStream("collage.jpg");
      src.pipe(dest);
    });
})();