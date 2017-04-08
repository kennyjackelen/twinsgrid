/// <reference path="node_modules/@types/express/index.d.ts" />
/// <reference path="node_modules/@types/handlebars/index.d.ts" />
import { Gameday, TwinsGames } from './gameday';
import express = require('express');
import handlebars = require('handlebars');
import handlebarsIntl = require('handlebars-intl');
import moment = require('moment');
import fs = require('fs');
import path = require('path');

const PORT = process.env.PORT || 8080;
const SITE_ROOT = process.env.SITE_ROOT || '';

const app = express();

let template : HandlebarsTemplateDelegate;

handlebarsIntl.registerWith( handlebars );

handlebars.registerHelper(
  'lastDigit',
  function( value : number ) {
    return value % 10;
  }
);

handlebars.registerHelper(
  'prevWeek',
  function( value : Date ) {
    let m : moment.Moment = moment( value );
    m.subtract( 1, 'week' );
    return m.format('YYYY-MM-DD')
  }
);

handlebars.registerHelper(
  'nextWeek',
  function( value : Date ) {
    let m : moment.Moment = moment( value );
    m.add( 1, 'week' );
    return m.format('YYYY-MM-DD')
  }
);

handlebars.registerHelper(
  'siteRoot',
  function() {
    return SITE_ROOT ? SITE_ROOT + '/' : '';
  }
);

initializeTemplate().then( startApp );

app.use( '/manifest.json', express.static('./manifest.json') );
app.use( '/images', express.static('images') );

app.get('/', async function (req, res) {
  let g = new Gameday();
  let gs : TwinsGames = await g.GetThisWeeksScores();
  res.send( template( gs ) );
})
app.get('/date/:date', async function (req, res) {
  let g = new Gameday();
  let d = new Date( req.params.date );
  d.setTime( d.getTime() + d.getTimezoneOffset()*60*1000 );
  let gs : TwinsGames = await g.GetThisWeeksScores( d );
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
