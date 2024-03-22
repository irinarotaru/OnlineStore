const cookieParser=require('cookie-parser');
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser')
const session=require('express-session');
const fs = require('fs');
const reqip = require('request-ip');
const app = express();
const port = 6789;
var sqlite3 = require('sqlite3');
const utilizatori=JSON.parse(fs.readFileSync('./utilizatori.json'));
var apasat=false;
var myBD = new sqlite3.Database('./cumparaturi.db', sqlite3.OPEN_READWRITE);
app.use(cookieParser());
// directorul 'views' va conține fișierele .ejs (html + js executat la server)
app.set('view engine', 'ejs');
// suport pentru layout-uri - implicit fișierul care reprezintă template-ul site-ului este views/layout.ejs
app.use(expressLayouts);
// directorul 'public' va conține toate resursele accesibile direct de către client(e.g., fișiere css, javascript, imagini)
app.use(express.static('public'))
// corpul mesajului poate fi interpretat ca json; datele de la formular se găsesc înformat json în req.body
app.use(bodyParser.json());
// utilizarea unui algoritm de deep parsing care suportă obiecte în obiecte
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret:'secret-key',
    resave:false,
    saveUninitialized:false
}));
var incercari=[];
var timpi=[];
var inceput=0;
var produse=[];
function ipBlocat(req,res)
{
  let ip=reqip.getClientIp(req);
  if(req.session.blocked!=null)
  {
    if(req.session.blocked.includes(ip)){
      //res.send("Utilizator blocat din cauza accesarii unor resurse inexistente");
      const durata=60*1000; //1 minut
      
      if(Date.now()-inceput<durata)
      {
        return true;
      }
      else{
        console.log("s-a terminat");
        return false;
      }
      /*const inceput=blocati.get(ip);
      console.log(Date.now()-inceput);
      if(Date.now()-inceput>durata)
      {
        console.log("s-a terminat");
        blocati.delete(ip);
      }
      else{
        res.send("Utilizator blocat din cauza accesarii unor resurse inexistente");
        return true;
      }*/
    }
  }
  return false;
}
// la accesarea din browser adresei http://localhost:6789/ se va returna textul 'HelloWorld'
// proprietățile obiectului Request - req - https://expressjs.com/en/api.html#req
// proprietățile obiectului Response - res - https://expressjs.com/en/api.html#res
app.get('/', (req, res) => {
   if(ipBlocat(req,res)==false)
   {
    const utilizator=req.session.username;
    const tip=req.session.tip;
    if(apasat==true)
    {
      myBD.all(`select product_id, name, price from produse;`, (err,rows) => {
      produse=rows;
      })
    }
    res.render('index',{tip:tip,utilizator:utilizator,products:produse})
    res.mesajEroare=null;
    }
    else{
      res.send("Utilizator blocat din cauza accesarii unor resurse inexistente");
    }
  });

app.get('/delogare',(req,res)=>
{
    if(ipBlocat(req,res)==false)
    {
      d=1;
      //req.session.username=null;
      //req.session.cos=null;
      req.session.destroy();
      //res.clearCookie('user');
      const utilizator=null;
      res.render('index',{utilizator:utilizator,products:undefined});
    }
    else{
      res.send("Utilizator blocat din cauza accesarii unor resurse inexistente");
    }
});
app.get('/creare-bd',(req,res) =>
{
    myBD = new sqlite3.Database('./cumparaturi.db', (err) => {
        myBD.exec(`
          create table if not exists produse (
            product_id int primary key not null,
            name text not null,
            price real
          );
          `, ()  => {
              res.redirect('/');
      });
    });
});
app.get('/inserare-bd',(req,res) =>
{
    myBD.exec(`
    insert into produse( product_id, name, price) values (2, "Masina de spalat", 1500);
  `, () => {
    res.redirect('/');
  })
}
);
app.get('/incarcare-bd',(req,res) =>
{
    tip=req.session.tip;
    utilizator=req.session.username;
    apasat=true;
    myBD.all(`select product_id, name, price from produse;`, (err,rows) => {
        produse=rows;
        res.render('index',{utilizator:utilizator,products:rows,tip})
    })
});

app.post('/adaugare_cos', (req, res) => {
    if(req.session.cumparaturi == null)
      req.session.cumparaturi = [];
    if(req.session.cumparaturi[req.body.id] != null)
      req.session.cumparaturi[req.body.id] = req.session.cumparaturi[req.body.id] + 1;
    else
      req.session.cumparaturi[req.body.id] = 1;
    res.redirect('/');
});

app.get('/vizualizare-cos',(req,res) =>{
  if(ipBlocat(req,res)==false)
  {
    const tip=req.session.tip;
    const utilizator=req.session.username;
    req.session.cos=produse;
    myBD.all(`select name from produse;`,(err,rows)=>
    {
      res.render('vizualizare-cos',{tip:tip,utilizator:utilizator,produse:rows,cantitati:req.session.cumparaturi});
    })
    }
  else{
    res.send("Utilizator blocat din cauza accesarii unor resurse inexistente");
  }
});

// la accesarea din browser adresei http://localhost:6789/chestionar se va apela funcția specificată
app.get('/chestionar', (req, res) => {
    if(ipBlocat(req,res)==false)
    {
      const tip=req.session.tip;
      const utilizator=req.session.username;
      const fs = require('fs-extra');
      const path = require('path');
      const intrebariFile = path.join(__dirname, 'intrebari.json');
      const listaIntrebari = fs.readJSONSync(intrebariFile);
  // în fișierul views/chestionar.ejs este accesibilă variabila 'intrebari' care conține vectorul de întrebări
      res.render('chestionar', {tip:tip,intrebari: listaIntrebari,utilizator:utilizator});
    }
    else{
      res.send("Utilizator blocat din cauza accesarii unor resurse inexistente");
    }
});

app.post('/rezultat-chestionar', (req, res) => {
  const tip=req.session.tip;
  const utilizator=req.session.username;
  const fs = require('fs-extra');
  const path = require('path');
  const intrebariFile = path.join(__dirname, 'intrebari.json');
  const listaIntrebari = fs.readJSONSync(intrebariFile);
 const raspunsuriUtilizatori=[];
 let numarRaspunsuriCorecte=0;
 for (let i = 0; i < listaIntrebari.length; i++) {
    const cheie = 'intrebare_' + i;
    const raspunsUtilizator = parseInt(req.body[cheie]);
    raspunsuriUtilizatori.push(raspunsUtilizator);
    const intrebare = listaIntrebari[i];
    const raspunsCorect = intrebare.corect;
    
    if (raspunsUtilizator === raspunsCorect) {
      numarRaspunsuriCorecte++;
    }
  }
 console.log(req.body);
 console.log(numarRaspunsuriCorecte);
 res.render('rezultat-chestionar',{numarRaspunsuriCorecte,utilizator,tip:tip});
});

var ok=0;
var d=0;

app.get('/autentificare', (req, res) => {
    if(ipBlocat(req,res)==false)
    {
      const utilizator=req.session.username;
      /*var utilizator;
      if(ok!=0)
      {
        utilizator=req.cookies.user;
      }
      else
      {
        res.clearCookie('user');
      }
      if(d==1)
      {
        utilizator=null;
      }*/
      const tip=req.session.tip;
      const eroare=req.cookies.mesajEroare;
      res.clearCookie('mesajEroare');
      ip=reqip.getClientIp(req);
      for(ip in timpi)
      {
        if((fin-inc)/1000>15)
        {
          durata=1000*15;
        }
        else{
          durata=1000*30;
        }
        if(timpi[ip]+durata>Date.now())
        {
          res.send("Logarea a esuat. Asteptati "+durata/1000+" secunde");
        }
        else{
          delete timpi[ip];
          incercari[ip]=0;
        }
      }
      res.render('autentificare',{eroare,utilizator,tip});
    }
    else{
      res.send("Utilizator blocat din cauza accesarii unor resurse inexistente");
    }
});

app.post('/verificare-autentificare',(req,res) => {
    console.log(req.body);
    let cheie = 'user';
    const user=req.body[cheie];
    let cheie2='pass';
    const parola=req.body[cheie2];
    //if((user.length>0)&&(parola.length>0))
    for(const u in utilizatori)
    {
        if(utilizatori[u].utilizator==user&&utilizatori[u].parola==parola)
        {
            //res.send('Nume de utilizator și parolă valide');
            res.clearCookie('mesajEroare');
            req.session.username=user;
            req.session.tip=utilizatori[u].tip;
            req.session.nume=utilizatori[u].nume;
            req.session.prenume=utilizatori[u].prenume;
            res.cookie('user',user,'parola',parola);
            console.log('aici');
            ok=1;
            res.redirect('/');
        }
    }
    console.log("aici2");
    res.cookie('mesajEroare','Nume de utilizator sau parolă greșite');
    ip=reqip.getClientIp(req);
    if(ip in incercari)
    {
      incercari[ip]=incercari[ip]+1;
      console.log(incercari[ip]);
      if(incercari[ip]>3)
      {
        fin=Date.now();
        timpi[ip]=Date.now();
      }
    }
    else{
      incercari[ip]=1;
      inc=Date.now();
    }
    res.redirect('/autentificare');
});

app.get('/admin',(req,res)=>{
  if(ipBlocat(req,res)==false)
  {
    const utilizator=req.session.username;
    const tip=req.session.tip;
    if(req.session.tip=='ADMIN')
    {
      res.render('admin',{utilizator,tip});
    }
  }
  else{
    res.send("Utilizator blocat din cauza accesarii unor resurse inexistente");
  }
});

app.post('/adauga_produs',(req,res)=>{
  let name = req.body.name;
  let price = req.body.price;
  const regex=/[<>#]/g;
  if(regex.test(name))
  {
    return res.status(400).send('Caracterele introduse sunt invalide');
  }  
  let myBD = new sqlite3.Database('./cumparaturi.db', (err) => {
    if(err) {
        console.log(err.message);
        return;
    }
  });
  myBD.all(`select MAX(product_id) as idc from produse`, (err, data) => {
    if(err) {
        return console.log(err.message); 
    }
    let id = data[0].idc;
    myBD.run(`insert into produse(product_id, name, price) values (?, ?, ?)`, [id + 1, name, price], (err) => {
        if(err) {
            return console.log(err.message); 
        }
        res.redirect('/')
    })
  })
});

app.use(function(req,res){
  res.statusCode=404;
  if(req.session.nracces==null)
  {
    req.session.nracces=1;
  }
  else{
    req.session.nracces++;
  }
  if(req.session.nracces>3)
  {
    req.session.blocked=req.session.blocked || [];
    let ip=reqip.getClientIp(req);
    if(!req.session.blocked.includes(ip)){
      req.session.blocked.push(ip);
      inceput=Date.now();
    }
  }
  res.send('Resursa pe care doriți să o accesați nu există.');
});

app.listen(port, () => console.log(`Serverul rulează la adresa http://localhost:`+port));