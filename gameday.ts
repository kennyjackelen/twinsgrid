/// <reference path="node_modules/@types/request-promise/index.d.ts" />
import rp = require('request-promise');

interface GamedayGame {
  home_team_name: string;
  away_team_name: string;
  away_name_abbrev: string;
  home_name_abbrev: string;
  preview_link: string;
  ind: string;
  status: string;
  away_team_runs: string;
  home_team_runs: string;
  away_time: string;
  home_time: string;
  away_ampm: string;
  home_ampm: string;
}

class GamedayUtils {
  
  static yesterday() : Date {
    let d = new Date();
    d.setDate( d.getDate() - 1 );
    return d;
  }

  static pad( num : number ) : string {
    return ( '00' + num.toString() ).slice( -2 );
  }

  static getScoreboardURL( gameDate : Date ) {
    let year : number = gameDate.getFullYear();
    let month : number = gameDate.getMonth() + 1;
    let day : number = gameDate.getDate();

    return 'http://gd2.mlb.com/components/game/mlb/year_' + year.toString()
            + '/month_' + GamedayUtils.pad( month ) + '/day_' + GamedayUtils.pad( day ) + '/miniscoreboard.json';
  }

  static scoreIsValid( game : GamedayGame ) {
    let status : string = game.ind.charAt( 0 ).toUpperCase();
    if ( status === 'F' ) return true;  // Final
    if ( status === 'O' ) return true;  // Game Over
    if ( status === 'I' ) return true;  // In Progress
    if ( status === 'M' ) return true;  // Manager Challenge
    return false;
  }

  static isTwinsGame( game : GamedayGame ) {
    if ( game.away_name_abbrev === 'MIN' ) return true;
    if ( game.home_name_abbrev === 'MIN' ) return true;
    return false;
  }

  static twinsAreAwayTeam( game : GamedayGame ) {
    return ( game.away_name_abbrev === 'MIN' );
  }
}

export class Gameday {

  async GetThisWeeksScores( date = GamedayUtils.yesterday() ) : Promise<TwinsGames> {
    let endDate : Date;
    let startDate: Date;
    endDate = date;
    while( endDate.getDay() !== 0 ) {
      endDate.setDate( endDate.getDate() + 1 );
    }
    startDate = new Date( endDate.toString() );
    startDate.setDate( endDate.getDate() - 6 );
    return this.GetScores( startDate, endDate );
  }

  async GetScores( startDate : Date, endDate : Date ) : Promise<TwinsGames> {
    let scores : TwinsGames = new TwinsGames();
    let promises : Array<Promise<Array<TwinsGame>>> = [];
    let results : Array<Array<TwinsGame>>;

    scores.StartDate = startDate;
    scores.EndDate = endDate;

    let i : number = 0
    while ( true ) {
      let d : Date = new Date( startDate.toString() );
      d.setDate( startDate.getDate() + i );
      if ( d > endDate ) {
        break;
      }
      promises.push( this.getTwinsGame( d ) );
      i++;
    }
    results = await Promise.all( promises );
    for ( let j = 0; j < results.length; j++ ) {
      for ( let k = 0; k < results[ j ].length; k++ ) {
        scores.AddGame( results[ j ][ k ] );
      }
    }
    return scores;
  }

  private async getTwinsGame( gameDate : Date ) : Promise<Array<TwinsGame>> {
    return new Promise<Array<TwinsGame>>(
      function( resolve : Function, reject : Function ) {
        let twinsGames : Array<TwinsGame> = [];
        rp( GamedayUtils.getScoreboardURL( gameDate ) )
          .then(
            function( schedule : string ) {
              let games : Array<any>;
              try {
                games = JSON.parse( schedule ).data.games.game || [];
              }
              catch ( e ) {
                games = [];
              }
              for ( let i = 0; i < games.length; i++ ) {
                let game : GamedayGame = games[ i ];
                if ( GamedayUtils.isTwinsGame( game ) ) {
                  let twinsGame = new TwinsGame();
                  twinsGame.GameStatus = game.status;
                  twinsGame.GameURL = game.preview_link;
                  if ( GamedayUtils.twinsAreAwayTeam( game ) ) {
                    if ( GamedayUtils.scoreIsValid( game ) ) {
                      twinsGame.TwinsScore = Number( game.away_team_runs );
                      twinsGame.OpponentScore = Number( game.home_team_runs );
                    }
                    twinsGame.GameTime = game.away_time + ' ' + game.away_ampm;
                    twinsGame.OpponentName = game.home_team_name;
                  }
                  else {
                    if ( GamedayUtils.scoreIsValid( game ) ) {
                      twinsGame.TwinsScore = Number( game.home_team_runs );
                      twinsGame.OpponentScore = Number( game.away_team_runs );
                    }
                    twinsGame.GameTime = game.home_time + ' ' + game.home_ampm;
                    twinsGame.OpponentName = game.away_team_name;
                  }
                  twinsGame.GameDate = gameDate;
                  twinsGames.push( twinsGame );
                }
              }
              resolve( twinsGames );
            }
          )
          .catch(
            function( e ) {
              console.log( e );
              reject( e );
            }
          );
      }
    );
  }

}

export class TwinsGames {

  private games : Array<TwinsGame>
  public StartDate : Date
  public EndDate : Date
  public TwinsTotal : number
  public OpponentTotal : number

  constructor() {
    this.games = [];
  }

  AddGame( game : TwinsGame ) {
    this.games.push( game );
    this.TwinsTotal = this.getTwinsTotal();
    this.OpponentTotal = this.getOpponentTotal();
  }

  private getTwinsTotal() : number {
    let total : number = 0;
    for ( let i = 0; i < this.games.length; i++ ) {
      let score = this.games[ i ].TwinsScore;
      if ( !isNaN( score ) ) {
        total += this.games[ i ].TwinsScore;
      }
    }
    return total;
  }

  private getOpponentTotal() : number {
    let total : number = 0;
    for ( let i = 0; i < this.games.length; i++ ) {
      let score = this.games[ i ].OpponentScore;
      if ( !isNaN( score ) ) {
        total += this.games[ i ].OpponentScore;
      }
    }
    return total;
  }

}

export class TwinsGame {

  public TwinsScore : number
  public OpponentScore : number
  public GameDate : Date
  public GameStatus : string
  public OpponentName : string
  public GameURL : string
  public GameTime : string

}