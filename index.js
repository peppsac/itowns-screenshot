const puppeteer = require('puppeteer');
const fs = require('fs');
const createCollage = require("photo-collage");

// Parse example/index.html
function extractExamplesFromIndex() {
  const path = process.argv[2] + '/examples/index.html';
  const data = fs.readFileSync(path, 'utf8');
  return data.split("href=\'./").map((u) => {
    const end = u.indexOf("'", 0);
    return u.slice(0, end);
  }).slice(1);
}

const examples = process.argv.length > 3 ?
  process.argv.slice(3).map(n => `${n}.html`) :
  extractExamplesFromIndex();

console.log('URLs:', examples);

const examplesImage = [];
const start = Date.now();
(async () => {
  const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});

  for (const example of examples) {
    const page = await browser.newPage();
    page.setViewport({ width: 400, height: 300 });
    const exampleStart = Date.now();
    process.stdout.write(`${(exampleStart - start) / 1000} s - loading ${example} `);
    await page.goto(`http://localhost:8080/examples/${example}`);
    process.stdout.write('.')
    // page.on('console', msg => {
    //   console.log((Date.now() - start) / 1000, ...msg.args().map(o => o.toString()));
    // });
    process.stdout.write('.')
    // Get the "viewport" of the page, as reported by the page.
    const res = await page.evaluate((example) => {
      function resolveOnLoad(x) {
        return new Promise(resolve => {
          function getView() {
            console.log('getview...');
            if (typeof(view) === 'object') {
              return onViewFound(view);
            }
            if (typeof(globeView) === 'object') {
              return onViewFound(globeView);
            }

            // console.warn(`FAIL to retrieve the View in ${example}`);
            setTimeout(() => { getView() }, 100);
          }

          getView();

          // setup default timeout
          setTimeout(() => { resolve(false); }, 30000);

          function onViewFound(v) {
            v.mainLoop.addEventListener('command-queue-empty', () => {
              v.addFrameRequester('after_render', () => {
                resolve(true);
              });
            });
            v.notifyChange(false);
          }
        });
      }

      return resolveOnLoad();
    }, example);
    process.stdout.write('.')

    if (!res) {
      process.stdout.write('☠')
    }

    await page.screenshot({path: example.replace('html', 'png')});
    examplesImage.push(example.replace('html', 'png'));
    process.stdout.write(`. wrote ${example.replace('html', 'png')} [${(Date.now() - exampleStart) / 1000} s]\n`);
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
