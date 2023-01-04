var createError = require('http-errors');
var express = require('express');
const Jimp = require('jimp');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const bodyParser = require('body-parser');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var testRouter = require('./routes/test');
var mysql = require('mysql');
const DomParser = require('dom-parser');
var app = express();
var bcrypt = require ('bcryptjs');
var request = require('request').defaults({ encoding: null });
const fetch = require('node-fetch');
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.raw());
app.use(function(req, res, next) {
  console.log("SERVER REQUEST")
  console.log(req.method)

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST,OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', false);
  console.log("set header")
  //https://stackoverflow.com/questions/40497399/http-request-from-angular-sent-as-options-instead-of-post
  if(req.method=="OPTIONS"){
    console.log("GOT OPTIONS REQ")
    res.writeHead(200, {"Content-Type": "application/json"});
    res.end();
    return
  }
  next();
});

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/test', testRouter);

//make sure security group has ipv4 any IP
// let con = mysql.createConnection({
//   host: "dotafantasydb.ccxbscupv24e.us-east-1.rds.amazonaws.com",
//   user: "root",
//   password: "Matthew7611!!",
//   database: 'sys',
// });
let con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: 'dotafantasy',
});
con.connect(function(err) {
  console.log("TRYING TO CONNECT")
  if (err) throw err;
  console.log("CONNECTED")
  console.log("running on port 5000")
});
app.get('/max', function(req, res, next) {

  con.query("Select * from user ", function (err, result) {
    if (err) throw err;
    console.log(result)
    res.send(result);
    });

});

app.post('/register', (req, res) => {
  console.log("REGISTERING")
  console.log(req.body)

  con.query("Select * from user WHERE username=? ",[req.body.username], function (err, result) {
  if (err) throw err;

  if(result.length>0)
  {
      res.send({msg:"user already exists"});
  }else{
      var password = req.body.password
      const saltRounds = 5;
      bcrypt.hash(password, saltRounds, async function(err, hash) {
          // Store hash in database here
          console.log(hash)
          await con.query("INSERT INTO user (username,hash) VALUES (?, ?)", [req.body.username,hash],  (err,rows) => {
              if (err) {
                 console.log(err)
              }else{
                  res.send({msg:"success register"});
              }
              });   
        });     

  }

  });

});
app.use('/login', (req, res) => {
  console.log(req.body)
  con.query("Select * from user WHERE username=?",[req.body.username], function (err, result) {
  if (err) throw err;
  // console.log("Result: " + result);
  console.log(result.length)
  console.log(result)
  if(result.length>0)
  {
      var hash = result[0].hash
      console.log(req.body.password+" AND "+hash)
      bcrypt.compare(req.body.password, hash, function(err, result) {
          // returns result
          if(result){
              console.log("PASSOWRD MATCH")
              res.send({token:"loginToken"});
          }else{
              console.log("PASSWORD NOT MATCH")
              res.send({});
          }
        });

  }
  else    
  {
      res.send({});
  }

  });

});
app.get('/getMyLeagues', function (req, res) {
  // res.send({"dsa":'Hello world from Express.'});
  console.log("GET REQUEST")

  con.query("Select * from userleagueteam, dotaleague WHERE userleagueteam.user = ? AND dotaleague.leagueid = userleagueteam.leagueid",[req.query.user], function (err, result) {
  if (err) throw err;
  // console.log("Result: " + result);


      //console.log(result)
      res.send(result)
  // res.status(200).send("tournamentArray")
  });
});
app.get('/getTournaments', function (req, res) {
  // res.send({"dsa":'Hello world from Express.'});
  console.log("GET REQUEST")

  con.query("Select * from dotaleague", function (err, result) {
  if (err) throw err;
  // console.log("Result: " + result);
  const tournamentArray = [];
  var leagueName,leagueId
  for(var i=0;i<result.length;i++)
  {
      console.log(result[i]['leaguenameopendota'])
      leagueName = result[i]['leaguenameopendota']
      leagueId = result[i]['leagueid']
      tournamentArray.push({leagueName,leagueId})
  }
  console.log("RETURN SUCCESS")
 
  res.send(tournamentArray)
  // res.status(200).send("tournamentArray")
  });
});
app.get('/getLeagueTeam', function (req, res) {
  // res.send({"dsa":'Hello world from Express.'});
  console.log("GET REQUEST")
  console.log(req.query.leagueId+" AND "+req.query.teamname)
  con.query("Select convert(playerimage using utf8), dotaplayer.playername, currentprice, teamname,playerid from playerteamleague,dotaplayer WHERE leagueid = ? AND teamname=? AND dotaplayer.playername=playerteamleague.playername",[req.query.leagueId,req.query.teamname], function (err, result) {
  if (err) throw err;

  res.send(result)
  // res.status(200).send("tournamentArray")
  });
});
app.get('/getLeagueTeams', function (req, res) {
  // res.send({"dsa":'Hello world from Express.'});
  console.log("GET REQUEST")
  console.log(req.query.leagueId)
  //console.log(req.query)
  //https://www.geeksforgeeks.org/how-to-convert-from-blob-to-text-in-mysql/
  con.query("Select teamrating,teamid,teamname, convert(logo using utf8) from leagueteams WHERE leagueid = ? ORDER BY teamrating DESC",[req.query.leagueId], function (err, result) {
  if (err) throw err;
  //console.log("Result: " + result);
  const returnArray = [];

  con.query("Select convert(playerimage using utf8),dotaplayer.playername, currentprice, teamname from playerteamleague,dotaplayer WHERE leagueid = ? AND dotaplayer.playername = playerteamleague.playername ORDER BY position ASC",[req.query.leagueId], function (err, playerResult) {
     
      if (err) throw err;
      //console.log("Result: " + playerResult);

      var leagueName,leagueId
      for(var i=0;i<result.length;i++)
      {
          var playerArray=[];
          var teamname = result[i]['teamname'];
          //console.log("TEAM "+result[i]['teamname'])
          for(var j=0;j<playerResult.length;j++)
          {
              if( playerResult[j]['teamname']==result[i]['teamname'])
              {
                  //console.log(playerResult[j]['playername'])
                  playerArray.push({"playername":playerResult[j]['playername'],
                                    "currentPrice":playerResult[j]['currentprice'],
                                    "playerImage":playerResult[j]['convert(playerimage using utf8)']})
              
              }
          }
          // console.log(playerArray)
         // console.log(result[i]['convert(logo using utf8)'])
          returnArray.push({"teamname":result[i]['teamname'],"logo":result[i]['convert(logo using utf8)'],"players":playerArray,"teamid":result[i]['teamid'],"teamrating":result[i]['teamrating']})
      }
  console.log("RETURN SUCCESS")
//    console.log(returnArray)
  res.send(returnArray)
  // res.status(200).send("tournamentArray")
  });
  });
});
app.post('/addTournament', function (req, res) {
  //res.__setitem__("Access-Control-Allow-Origin", "*")
  console.log("POST REQUEST")
  console.log(req.body)
  con.query("INSERT INTO dotaleague (leagueid, ggscoreurl) VALUES (?, ?)", [req.body.leagueId,req.body.ggscoreurl], async (err,rows) => {
  if (err) {
      console.log("error"+err.sqlMessage)
      res.status(400).send(err.sqlMessage)
  }else{
     console.log("adding league teams")
     var response = await GGSCOREaddLeagueTeams(req.body.ggscoreurl,req.body.leagueId)
     res.send("adding success")
  }

  });   
    
  //res.status(200)
});
async function GGSCOREaddLeagueTeams(ggscoreurl,leagueid){
  var leagueHtml = await getHtml(ggscoreurl)
  //console.log(leagueHtml)
  var parser = new DomParser();
  var doc = parser.parseFromString(leagueHtml, 'text/html');
  var collection = doc.getElementsByClassName("teams-block")

  //0 upper div 1 lower div
  doc = parser.parseFromString(collection[0].innerHTML, 'text/html')
  collection = doc.getElementsByClassName("tb")
  console.log(collection)
  for(var x=0;x<collection.length;x++){
    //console.log(collection[x].innerHTML)
    var urlStart = collection[x].innerHTML.indexOf('<a href="')+9
    var urlEnd = collection[x].innerHTML.indexOf('"',urlStart)
    //console.log(urlStart+" and "+ urlEnd)
    var teamUrl = "https://ggscore.com/"+collection[x].innerHTML.substring(urlStart,urlEnd)
    await GGSCOREaddTeam(teamUrl)
  }
  //console.log(leagueHtml)
}
async function GGSCOREaddTeam(ggscoreteamurl){

  var teamHtml = await getHtml(ggscoreteamurl)
  var parser = new DomParser();
  var doc = parser.parseFromString(teamHtml, 'text/html');
  var collection = doc.getElementsByClassName("mlh mlhSM")
  collection = collection[0].getElementsByTagName("span")
  var teamname = collection[0].innerHTML
  console.log(teamname)
  collection = doc.getElementsByClassName("playerava")
  var urlStart = collection[0].innerHTML.indexOf('img src="')+9
  var urlEnd = collection[0].innerHTML.indexOf('"',urlStart)
  var teamLogo = "https://ggscore.com/"+collection[0].innerHTML.substring(urlStart,urlEnd)
  console.log(teamLogo)


  collection = doc.getElementsByClassName("pinTeam")
  for(var x=0;x<collection.length;x++){

    console.log(collection[x].getElementsByClassName("pllink")[0].innerHTML)
    var urlStart = collection[x].innerHTML.indexOf('background-image:url(')+22  
    var urlEnd = collection[x].innerHTML.indexOf(')',urlStart)
    console.log(collection[x].innerHTML.substring(urlStart,urlEnd))
  }
}
async function getHtml(url) {
  const response = await fetch(url);
	const body = await response.text();
	//console.log(body);
	return body;
}
// app.post('/addTournament', function (req, res) {
//   //res.__setitem__("Access-Control-Allow-Origin", "*")
//   console.log("POST REQUEST")
//   console.log(req.body)
  
//   con.query("INSERT INTO dotaleague (leagueid, leaguenameopendota,liquipediaurl) VALUES (?, ?, ?)", [req.body.leagueId,req.body.leaguenameopendota,req.body.liquipediaurl], async (err,rows) => {
//   if (err) {
//       console.log("error"+err.sqlMessage)
//       res.status(400).send(err.sqlMessage)
//   }
//   else
//   {
//       console.log("Row inserted with id = " + rows.insertId);
//       var response = await addLeagueTeams(req.body.liquipediaurl,req.body.leagueId)
//       console.log("RESPONSE " + response.teamsNoId + " and "+response.duplicatedTeams)
//       res.status(200).send("successfully added league " + req.body.leaguenameopendota +". " + response.teamsNoId + " teams have no team id and "+ response.duplicatedTeams + " have duplicate ids found")
//   }

//   });   
// });
async function getResponse(league) {
  let url = 'https://liquipedia.net/dota2/api.php?action=parse&format=json&page='+league;
  const res = await fetch(url, {
      method: 'GET',
      headers: {
          'Accept': 'application/json',
          "Accept-Encoding": "gzip",
          "User-Agent":"Dota Fantasy League(test) (matthewcrossley7@gmail.com)"
      }, 
    })
    if (!res.ok) throw new Error(res.statusText)
    return res.json()
}
async function addPlayerImage( playername,leagueid,playerUrl )
{
    let leagueHtml = await getResponse(playerUrl);

    if(leagueHtml.error!=null)
    {
        //if player page doesnt exist just return
        console.log("NULL IMAGE")
        return
    }

    var text = leagueHtml.parse.text['*']
    var playerImage = null
    if(text.indexOf("redirectMsg")>0)
    {
        var urlStart = 7+text.indexOf("/dota2/")
        var newUrl = text.substring(urlStart, text.indexOf('"',urlStart))
        console.log("REDIRECT TO URL: "+newUrl)
        leagueHtml = await getResponse(newUrl);
    }
    
    if(leagueHtml.parse.properties.length>=4  )
    {
        playerImage = leagueHtml.parse.properties[3]['*'];
    }
     //console.log(playerImage)

    await addOrUpdatePlayerImage(playername,playerImage)
}
async function addOrUpdatePlayerImage(playername,imageurl){
  Jimp.read (imageurl)
  .then(image => {            
      image.resize(50,50, function(err){
      if (err) throw err;
      //var data = Buffer.from(image).toString('base64');
      image.getBase64(Jimp.AUTO, (err, res) => {
          con.query("Select * from dotaplayer WHERE playername=?",[playername], function (err, result) {
              if (err) throw err;
              // console.log("Result: " + result);
             // console.log(result.length)
              //console.log(result)
              if(result.length==0)
              {            
                  return new Promise((resolve, reject) => {
                      con.query("INSERT INTO dotaplayer (playername,playerimage) VALUES (?,?)", [playername, res], (err,rows) => {
                          if (err) console.log(err)//throw reject(err)
                          resolve("added player image "+ playername)
                          //console.log("added player image")
                  });
              })
              }else{
                  return new Promise((resolve, reject) => {
                      con.query("UPDATE dotaplayer SET playerimage = ? WHERE playername=?", [res, playername], (err,rows) => {
                          if (err) console.log(err)//throw reject(err)
                          resolve("added player image "+ playername)
                          console.log("UPDATED player image")
                      });
                  })
              }
              });
          })
      })
      })
      .catch(err => {
          con.query("INSERT INTO dotaplayer (playername) VALUES (?)", [playername], (err,rows) => {
              if (err) console.log(err)//throw reject(err)
             
              console.log("added player no image")
          });
          console.log("ERROR")
      });
}

async function addLeagueTeams(leagueUrl,leagueid)
  {
    let leagueHtml = await getResponse(leagueUrl);

    if(leagueHtml.error)
    {
        console.log("Invalid Url")
        return
    }
    var strHtml = leagueHtml.parse.text['*']
    var parser = new DomParser();
    var parser2 = new DomParser();

    var doc = parser.parseFromString(strHtml, 'text/html');
    var collection = doc.getElementsByClassName("teamcard toggle-area toggle-area-1")
    const teams = [];
    //for(let i=0;i<1;i++)
    for(let i=0;i<collection.length;i++)
    {
        var temp = doc.getElementsByClassName("teamcard toggle-area toggle-area-1")[i].innerHTML
        var tempParsed = parser2.parseFromString(temp, 'text/html');
        console.log("NEW TEAM")
        var logoHtml = tempParsed.getElementsByClassName("floatnone")[0].innerHTML
        //console.log(logoHtml)
        var srcStart = logoHtml.indexOf('"')
        var srcEnd = logoHtml.indexOf('"', srcStart+1)
        var logoUrl = logoHtml.substring(srcStart+1,srcEnd)
        var fullUrl = "https://liquipedia.net" + logoUrl

        var temporaryDotaTeam = tempParsed.getElementsByTagName("a");
        var notesOffset=0
        if(temporaryDotaTeam[1].innerHTML=="Notes")
        {
            notesOffset=1;
            console.log("WE GOT A NOTES")
        }
        //console.log("WORK "+ temporaryDotaTeam[0].innerHTML)
        //console.log(tempParsed.getElementsByTagName("td")[0].innerHTML)
        var playerUrls = tempParsed.getElementsByTagName("td")
       
        var team =[]
        for(let j=0;j<11;j+=2)
        {
            if(j>0)
            {
                var urlHtml = playerUrls[(j/2)-1].innerHTML
                var urlStart = urlHtml.lastIndexOf("/dota2")
                var urlEnd = urlHtml.indexOf('"', urlStart+1)

                team.push({"playername":temporaryDotaTeam[j+notesOffset].innerHTML,
                            "playerUrl":urlHtml.substring(urlStart+7,urlEnd)})
                //team.push(temporaryDotaTeam[j].innerHTML)
                console.log("player: "+temporaryDotaTeam[j+notesOffset].innerHTML)
            }
            else
            {
                team.push(temporaryDotaTeam[j].innerHTML)
            }
        }

        team.push(fullUrl)
        // console.log(JSON.stringify(team))
        teams[i]=team
    }
    console.log("TEAMs parsed")
    const teamArray = [];
    //var tempLeague = leagueid
    var teamsNoId = teams.length
    var duplicatedTeams=0
    var highestRating=0;
    var lowestRating=9999999;
    await getTeamsArray(leagueid,teams,async function(teamArray){
        if(teamArray)
        {
            console.log("TEAM LIST"+teamsNoId)
            //console.log(teamArray)
            
            for( var i=0;i<teams.length;i++)
            {
                var found = false;
                for(el of teamArray){

                    if(teams[i][0]==el[0])
                    {
                        if(!found)
                        {
                            found = true;
                            teams[i][7]= el[1]
                            teams[i][8]= el[2]
                            teamsNoId--

                            //console.log(teamsNoId+ " "+teams[i][0])
                        }
                        else
                        {
                            duplicatedTeams++
                        }
                    }
                }
                if( el[2] > highestRating)
                {
                    highestRating = el[2]
                }
                if( el[2] < lowestRating)
                {
                    lowestRating = el[2]
                }
            }
            console.log("starting to add teams and playerws"+leagueid)
            // use highestRating-lowestRating for calc player price?
            await addTeamsAndPlayersToDB(leagueid,teams)
            //console.log("ADDED teams and players")
           // addPlayersToDB(leagueid,teams)
        }
    })
    console.log(teamsNoId + " teams have no id and " + duplicatedTeams + " duplicated team names found")
    return {teamsNoId, duplicatedTeams}
  }
  async function addTeamsAndPlayersToDB(leagueid,teams)
  {
    for (let i = 0; i < teams.length; i++) {
        //console.log("Adding team "+teams[i][0])
        await addTeam(leagueid, teams[i][7] ,teams[i][0],teams[i][8],teams[i][6]);

        for (let j = 1; j < 6; j++) {
            
            //var playerPrice = getPlayerPrice( teams[i][8], j)
            //console.log("player "+ teams[i][j]+ " has price "+ playerPrice)
            await addPlayer(teams[i][j].playername ,leagueid,teams[i][0],j,teams[i][j].playerUrl);
            //find player id? https://api.opendota.com/api/proPlayers?api_key=YOUR-API-KEY
            //console.log(playerResponse)
        }
        await addPlayerTeamPrices(teams[i][0],teams[i][8])
    }
    console.log("all players added to playerteamleague")
    console.log("adding players id + stats")
    addingPlayerIds(leagueid)
  }
function addTeam(leagueid, teamId, teamname, rating,fullUrl ) {
    request.get(fullUrl, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            //.toString uses less memory? But doesnt display image on mysql var sizeof = require('object-sizeof')
            data = Buffer.from(body).toString('base64');
            //data = Buffer.from(body,'base64');
            return new Promise((resolve, reject) => {
                con.query("INSERT INTO leagueteams (leagueid,teamid, teamname, teamrating,logo) VALUES (?, ?,?, ?,?)", [leagueid,teamId,teamname,rating,data],(err,rows) => {
                    if (err) throw reject(err)
                    resolve("added team: "+ teamname)
                });
            })
        }

    });

}  
async function addPlayer(playername, leagueid,teamname,position,playerUrl) {
  //console.log("url "+playerUrl+ " playername "+playername+" LEAGE"+leagueid)
  return new Promise((resolve, reject) => {
      con.query("INSERT INTO playerteamleague (playername, leagueid, teamname, position,currentprice) VALUES (?,?,?,?,?)", [playername,leagueid,teamname,position,-1],async (err,rows) => {
          if (err) console.log(err)//throw reject(err)
          if(true)
          {
              await addPlayerImage(playername,leagueid,playerUrl);
          }
          resolve("added player "+ playername)
      });
  })
}
  //playerprice set in function
// function getPlayerPrice( teamRating, position)
// {
//     if(teamRating==null)
//     {
//         return -1
//     }
//     return (6-position) * (teamRating / 3);
    
// }
app.post('/addTeamSelection', function (req, res) {
  console.log("POST REQUEST")

  con.query("INSERT INTO userleagueteam (user, leagueid ,player1,player2,player3,player4,player5) VALUES (?, ?, ?, ?, ?, ?, ?)", [req.body.user,req.body.leagueid,req.body.players[0],req.body.players[1],req.body.players[2],req.body.players[3],req.body.players[4]],  (err,rows) => {
  if (err) {
      console.log("error"+err.sqlMessage)
      
      con.query("UPDATE userleagueteam SET player1 =?,player2=?,player3=?,player4=?,player5=? WHERE user =? AND leagueid =?", [req.body.players[0],req.body.players[1],req.body.players[2],req.body.players[3],req.body.players[4],req.body.user,req.body.leagueid],  (err,rows) => {
          if (err) {
              res.status(400)
          }
          else
          {
              //res.sendStatus(200)
              res.send('Team Succesfully Updated')
          }
          }); 
  }
  else
  {
     //res.sendStatus(200)
     res.send('Team Succesfully Added')
  }

  });   
});
app.get('/getUserLeagueTeam', function (req, res) {
  // res.send({"dsa":'Hello world from Express.'});
  console.log("GET REQUEST")
  console.log(req.query.user+" AND "+ req.query.leagueid)
  con.query("Select * from userleagueteam WHERE user = ? and leagueid =? ",[req.query.user,req.query.leagueid], function (err, result) {
  if (err) throw err;
  //console.log("Result: " + JSON.stringify(result));

  if(result.length==0)
  {
      console.log("EMPTY")
      res.send({})
      return
  }

  var selectedPlayers = []
  var totalPrice =0;

  con.query("Select convert(playerimage using utf8), dotaplayer.playername, currentprice from playerteamleague,dotaplayer WHERE dotaplayer.playername=playerteamleague.playername AND leagueid =? AND (playerteamleague.playername = ? OR playerteamleague.playername = ? OR playerteamleague.playername = ? OR playerteamleague.playername = ? OR playerteamleague.playername = ?)",
              [req.query.leagueid, result[0].player1,result[0].player2,result[0].player3,result[0].player4,result[0].player5], function (err, playerResult) {
      if (err) throw err;
      // console.log(playerResult)
      for(var x=0;x<playerResult.length;x++)
      {
          // console.log(playerResult[x].playername)
          totalPrice+=playerResult[x]['currentprice']
          selectedPlayers.push({"playername":playerResult[x]['playername'],
                                   "playerimage":playerResult[x]['convert(playerimage using utf8)'],
                                   "playerprice":playerResult[x]['currentprice']})
      }
      // console.log(selectedPlayers)
      // console.log(totalPrice)
      res.send({"selectedplayers":selectedPlayers,
                 "price":totalPrice })
  });


  });
});
app.get('/getLeagueRosterLocks', function (req, res) {
  // res.send({"dsa":'Hello world from Express.'});
  console.log("GET getLeagueRosterLocks"+req.query.leagueid)

  con.query("Select * from  dotaleague WHERE leagueid = ?",[req.query.leagueid], function (err, result) {
  if (err) throw err;
  // console.log("Result: " + result);

  //console.log(result[0].leagueStartDate+" START DATE"+typeof(result[0].leagueStartDate))
  //console.log(result)

  var returnJson={"lockStart":result[0].rosterlockstart,"lockEnd":result[0].rosterlockend,
                  "leagueStartDate":result[0].leagueStartDate,"leagueEndDate":result[0].leagueEndDate}
  res.send(returnJson)
  // res.status(200).send("tournamentArray")
  });
});
app.get('/getLeagueStandings', function (req, res) {
  // res.send({"dsa":'Hello world from Express.'});
  console.log("GET REQUEST LEAGUE STANDS"+req.query.leagueid)
  //console.log(req.query.leagueId+" AND "+req.query.teamname)
  con.query("Select * from userleagueteam WHERE leagueid = ? ORDER BY leaguepoints DESC",[req.query.leagueid], function (err, result) {
  if (err) throw err;

  res.send(result)
  // res.status(200).send("tournamentArray")
  });
});
var scoringJson={"kill":5,
                "assist":3,                
                "death":-1,
                "last hit":0.05,
                "win game":10,
                "stun enemy 1 second":0.1,
                "per allied healing":0.001
}
app.post('/updateLeague', function (req, res) {
    console.log("POST REQUEST"+req.body.leagueid+" xdd")
    calculateLeagueMatches(req.body.leagueid,scoringJson)
    //updatePlayer(req.body.playername,req.body.playerid,null)
});
async function calculateLeagueMatches(leagueid,scoring)
{
    console.log("LEAGUE "+ leagueid)
    const response = await fetch(`https://api.opendota.com/api/leagues/`+leagueid+`/matches/?api_key=8e2920d4-65f2-406a-9454-f59538c18c7e`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        }, 
      })
    const res = await response.json()
    var matchesNoTeams=0
    console.log(res.length+"LENGTH")
    //for(var x=0;x<3;x++){
    for(var x=0;x<res.length;x++){
        console.log("match "+x +" between "+res[x].radiant_team_id+" and "+  res[x].dire_team_id)

        var matchCalculated = await isMatchCalculated(leagueid,res[x].match_id)
        if(matchCalculated==1)
        {
            continue
        }
        await new Promise((resolve, reject) =>{
            con.query("Select * from leagueteams WHERE leagueid=? AND (teamid=? OR teamid = ?)",[leagueid,res[x].radiant_team_id,res[x].dire_team_id], async function (err, result) {
                if (err) throw err;
                
                if(result.length==2)
                {
                    const matchResponse = await fetch(`https://api.opendota.com/api/matches/`+res[x].match_id+`/?api_key=8e2920d4-65f2-406a-9454-f59538c18c7e`, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                        }, 
                      })
                    const matchRes = await matchResponse.json()
                    //console.log("MATCH ID PLAYERS: "+res[x].match_id +" teams: "+result[0].teamname+ " and "+result[1].teamname)
                    var matchesPlayers=[]
                    for(var y=0;y<matchRes.players.length;y++ )
                    {
                        //console.log(matchRes.players[y].account_id)
                        matchesPlayers.push({"playerid":matchRes.players[y].account_id,
                                             "kills":matchRes.players[y].kills,
                                             "assists":matchRes.players[y].assists,
                                             "deaths":matchRes.players[y].deaths,
                                             "lasthits":matchRes.players[y].last_hits,
                                             "stuns":matchRes.players[y].stuns,
                                             "herohealing":matchRes.players[y].hero_healing,
                                             "heroplayed":matchRes.players[y].max_hero_hit.unit,
                                             "playername":matchRes.players[y].name
                    })
                    }

                    await new Promise((resolve, reject) =>{

                        con.query("Select dotaplayer.playername from dotaplayer,playerteamleague WHERE dotaplayer.playername=playerteamleague.playername AND leagueid=? AND(playerid = ? OR playerid = ? OR playerid = ? OR playerid = ? OR playerid = ? OR playerid = ? OR playerid = ? OR playerid = ? OR playerid = ? OR playerid = ? )",[leagueid,matchesPlayers[0].playerid,matchesPlayers[1].playerid,matchesPlayers[2].playerid,matchesPlayers[3].playerid,matchesPlayers[4].playerid,matchesPlayers[5].playerid,matchesPlayers[6].playerid,matchesPlayers[7].playerid,matchesPlayers[8].playerid,matchesPlayers[9].playerid], async function (err, playersResult) {
                            if (err) throw err;
                            var validMatch
                            //only add points of 10 players found, else mark match as not completed
                            if(playersResult.length!=10)
                            {
                                console.log("NOT 10 PLAYERS")
                                console.log(matchesPlayers)
                                console.log(playersResult)
                                validMatch=0
                            }
                            else
                            {
                                validMatch=1
                                //console.log(matchesPlayers)
                                for(var z=0;z<matchesPlayers.length;z++)
                                {
                                    updateStats(matchesPlayers[z],scoring,leagueid)
                                }
                            }
                            completeMatch(validMatch,res[x].match_id,leagueid,result[0].teamname,result[1].teamname,matchCalculated)
                            //console.log(playersResult.length)
                            resolve()
                        });
                    });
                }else{
                    //console.log(result)
                    console.log("Cant find teams "+res[x].radiant_team_id+" AND "+res[x].dire_team_id)
                    matchesNoTeams++ 
                }
                resolve()
            });
        });
    }
    console.log(matchesNoTeams+" matches had wrong number of teams found")
    
}
async function getTeamsArray(leagueid,teams,callback) {
  let url = 'https://api.opendota.com/api/teams?api_key=8e2920d4-65f2-406a-9454-f59538c18c7e';
  await fetch(url, {
      method: 'GET', // or 'PUT'
      headers: {
        'Content-Type': 'application/json',
      }
    })
      .then((response) => response.json())
      .then((data) => {
        console.log('Success:');
        //console.log(data)
        const teamArray = [];
        for( var i=0;i<data.length;i++){
          teamArray.push([data[i].name, data[i].team_id, data[i].rating])
        }
       console.log("RETURNING")

      return callback(teamArray)
      })
      .catch((error) => {
        console.error('Error:', error);
      });

}
isMatchCalculated = (leagueid,matchid) =>{
  return new Promise((resolve, reject)=>{
      con.query("Select * from leaguematches WHERE leagueid=? AND matchid=?",[leagueid,matchid], (error, results)=>{
          if(error){
              return reject(error);
          }
          if( results.length==1){
              if(results[0].scorescounted==1)
              {
                  //console.log("LETS SKIP ")
                  return resolve(1)
              }else{
                  //console.log("NEED TO UPDATE ")
                  return resolve(2)
              }
          }else{
              //console.log("CREATE NEW ")
              return resolve(3)
          }
      });
  });
};
function updateStats(playerStats,scoring,leagueid){
  var matchScore=0
  matchScore+= scoring['kill']*playerStats.kills
  matchScore+= scoring['assist']*playerStats.assists
  matchScore+= scoring['death']*playerStats.deaths
  matchScore+= scoring['last hit']*playerStats.lasthits
  matchScore+= scoring['stun enemy 1 second']*playerStats.stuns
  matchScore+= scoring['per allied healing']*playerStats.herohealing
  //console.log("ADDING " +matchScore + "to player"+ playerStats.playername)
  con.query("UPDATE playerteamleague,dotaplayer SET points=points+?, leaguekills=leaguekills+?, leaguedeaths=leaguedeaths+?,matchesplayed=matchesplayed+1 WHERE dotaplayer.playername=playerteamleague.playername AND playerid=? AND leagueid=?",[matchScore,playerStats.kills,playerStats.deaths,playerStats.playerid,leagueid],function (err, result) {
      if (err) throw err;
  });

  con.query("SELECT * FROM dotaplayer,userleagueteam WHERE leagueid=? AND dotaplayer.playerid=? AND (dotaplayer.playername = userleagueteam.player1 OR dotaplayer.playername = userleagueteam.player2 OR dotaplayer.playername = userleagueteam.player3 OR dotaplayer.playername = userleagueteam.player4 OR dotaplayer.playername = userleagueteam.player5 )",[leagueid, playerStats.playerid], function (err, result) {
      if (err) throw err;
      if(result.length>0)
      {
          //console.log("TEAM RESULTS:")
          //console.log(result)
      }
      for(var x=0;x<result.length;x++)
      {
          //console.log("WINNER USER "+result[x].user)
          con.query("UPDATE userleagueteam SET leaguepoints=leaguepoints+? WHERE user=? AND leagueid=?",[matchScore,result[x].user,leagueid],function (err, res) {
              if (err) throw err;
              //console.log("PLAYER "+ result[x].user +" HAS PLAYER "+result[x].playername + " added points "+matchScore)
          });
      }
  });
}
function completeMatch(validMatch,matchid,leagueid,team1,team2,matchCalculated){

  if(matchCalculated==2){
      con.query("UPDATE leaguematches SET scorescounted=? WHERE leagueid=? AND matchid=?",[validMatch,leagueid,matchid], function (err, result) {
          if (err) throw err;
          //console.log("updated "+matchid)
      });
  }else{
      con.query("INSERT INTO leaguematches (leagueid,matchid,scorescounted,team1,team2) VALUES (?,?,?,?,?)",[leagueid,matchid,validMatch,team1,team2], function (err, result) {
          if (err) throw err;
          //console.log("created "+matchid)
      });
  }
}

async function addingPlayerIds(leagueid){
  const response = await fetch(`https://api.opendota.com/api/proplayers?api_key=8e2920d4-65f2-406a-9454-f59538c18c7e`, {
      method: 'GET',
      headers: {
          'Accept': 'application/json',
      }, 
    })
  const res = await response.json()
  var obj
  con.query("Select dotaplayer.playername from dotaplayer, playerteamleague WHERE leagueid=? AND dotaplayer.playername=playerteamleague.playername AND dotaplayer.playerid IS NULL",[leagueid], async function (err, result) {
      if (err) throw err;
      // console.log("Result: " + result);
      console.log(result.length)
      //console.log(result)
      for(var x=0;x<result.length;x++)
      {
          console.log("PLAYER "+result[x].playername)
          obj = res.find(o => o.name.toLowerCase() === result[x].playername.toLowerCase());
          // console.log(obj)
          if(obj!=null)
          {                
              console.log("FOUND "+ result[x].playername + " team:"+obj.team_name + " acc id "+obj.account_id+" x: "+x)
              await updatePlayer(obj.name, obj.account_id,obj.team_name)
          }else{
              console.log("COULDNT FIND "+ result[x].playername)
          }
      }
      }); 
}
async function updatePlayer(playername, accountId, foundteamname)
  {
    const matchesResponse = await fetch(`https://api.opendota.com/api/players/`+accountId+ `/recentMatches?api_key=8e2920d4-65f2-406a-9454-f59538c18c7e`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        }, 
      })
    const recentMatches = await matchesResponse.json()
    console.log(recentMatches.error)
    if(recentMatches.error)
    {
        console.log("ERROR ID")
        return
    }
    console.log("NO ID ERROR")
    var kills=0
    var deaths=0
    var assists=0
    var gpm=0
    var xpm=0
    var lastHits=0
    var prorecentgames=0
    for(var i=0;i<recentMatches.length;i++)
    {
        kills+=recentMatches[i].kills
        deaths+=recentMatches[i].deaths
        assists+=recentMatches[i].assists
        gpm+=recentMatches[i].gold_per_min
        xpm+=recentMatches[i].xp_per_min
        lastHits+=recentMatches[i].last_hits
        //lobby_type 1 = tournament game
        if(recentMatches[i].lobby_type==1)
        {
            prorecentgames++
        }
    }
    kills = parseInt(kills/recentMatches.length, 10)
    deaths = parseInt(deaths/recentMatches.length, 10)
    assists = parseInt(assists/recentMatches.length, 10)
    gpm = parseInt(gpm/recentMatches.length, 10)
    xpm = parseInt(xpm/recentMatches.length, 10)
    lastHits = parseInt(lastHits/recentMatches.length, 10)
    //console.log("kills:" +kills + "deaths:" +deaths +"assists:" +assists+"gpm:" +gpm+"xpm:" +xpm+"lasthits:" +lastHits)
    con.query("UPDATE dotaplayer SET playerid=?,foundteamname=?,kills=?,deaths=?,assists=?,gpm=?,xpm=?,lasthits=?,prorecentgames=? WHERE playername=?",  [accountId, foundteamname,kills, deaths,assists,gpm,xpm, lastHits, prorecentgames, playername], (err,rows) => {
        if (err) console.log(err)//throw reject(err)
        console.log("UPDATED player id")
    });
    
  }
app.post('/updatePlayer', function (req, res) {
    console.log("POST REQUEST"+req.body.playerid)
    updatePlayer(req.body.playername,req.body.playerid,null)
    console.log(req.body.currentprice+" AND "+req.body.imageurl)
    if( req.body.imageurl!=null){
      console.log("UPDATE URL")
      con.query("UPDATE dotaplayer SET playerimage=? WHERE playername=?",  [req.body.imageurl,req.body.playername], (err,rows) => {
          if (err) console.log(err)//throw reject(err)
          console.log("UPDATED player id")
      });
    }
    con.query("UPDATE playerteamleague SET currentprice=? WHERE playername=?",  [req.body.currentprice,req.body.playername], (err,rows) => {
        if (err) console.log(err)//throw reject(err)
        console.log("UPDATED player id")
    });

});
app.post('/updateTeam', function (req, res) {
  console.log("POST REQUEST")

  con.query("UPDATE leagueteams SET teamid=?, teamrating=? WHERE teamname=?", [req.body.teamid,req.body.teamrating,req.body.teamname],  (err,rows) => {
  if (err) {
      console.log("error"+err.sqlMessage)
  }
  else
  {
    addPlayerTeamPrices(req.body.teamname,req.body.teamrating)
    res.send('Team Succesfully Updated')
  }
  });   
});
function addPlayerTeamPrices(teamname, teamrating){
  con.query("UPDATE playerteamleague SET currentprice = (6-position)*(?/3) WHERE currentprice=-1 AND teamname=?", [teamrating,teamname],  (err,rows) => {
    if (err) {
        console.log("error"+err.sqlMessage)
    }
    else
    {
      
    }
    });  
}
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  console.log("ya")
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  console.log("nah")
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
