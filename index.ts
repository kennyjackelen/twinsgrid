/// <reference path="node_modules/@types/express/index.d.ts" />
/// <reference path="node_modules/@types/handlebars/index.d.ts" />
import { Gameday, TwinsGames } from './gameday';
import express = require('express');
import handlebars = require('handlebars');
import handlebarsIntl = require('handlebars-intl');
import fs = require('fs');
import path = require('path');

const PORT = process.env.PORT || 8080;

const app = express();

let template : HandlebarsTemplateDelegate;

handlebarsIntl.registerWith( handlebars );

handlebars.registerHelper(
  'lastDigit',
  function( value : number ) {
    return value % 10;
  }
);

initializeTemplate().then( startApp );

app.get('/', async function (req, res) {
  let g = new Gameday();
  let gs : TwinsGames = await g.GetThisWeeksScores();
  res.send( template( gs ) );
})

function startApp() {
  // go baby go!
  app.listen( PORT );
}

function initializeTemplate() : Promise<void> {
  return new Promise<void>(
    function( resolve : Function, reject : Function ) {
      let filePath = path.join( __dirname, 'templates/main.hbs');
      fs.readFile(
        filePath,
        'UTF-8',
        function( err: NodeJS.ErrnoException, fileContents: Buffer ) {
          template = handlebars.compile( fileContents.toString() );
          resolve();
        }
      );
    }
  );
}
