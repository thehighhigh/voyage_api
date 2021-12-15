const express = require('express')
const app = express()
const port = 3000
const fs = require('fs')
const readline = require('readline')
const mysql = require('mysql2')

let con
if(process.env.NODE_ENV === 'production') {
  con = mysql.createConnection(process.env.DATABASE_URL)
} else {
  con = mysql.createConnection({
    host: 'mysql',
    user: 'root',
    password: 'root',
    database: 'voyage_api'
  })
}
con.connect((err) => {
  if (err) {
    console.log('err connecting you are wrong: ' + err.stack)
    return
  }
  console.log('sql connect success')
})

let rl = readline.createInterface({
  input: fs.createReadStream(`${__dirname}/sql/create.sql`),
  terminal: false
 })
rl.on('line', function(chunk){
    con.query(chunk.toString(), function(err, sets, fields){
     if(err) console.log(err)
    })
})
rl.on('close', function(){
  console.log("initial sql migration finished")
})


app.use(express.json())

app.get('/recipes', (req, res) => con.query(`SELECT id, title, making_time, serves, ingredients, cost  FROM recipes`,
  (err, result) => {
    console.log(err)
    for(let el of result) {
      el.cost = el.cost.toString()
    }
    res.json({ recipes: result })
  }))

app.post('/recipes', (req, res, next) => con.query('INSERT INTO recipes(title, making_time, serves, ingredients, cost) VALUES(?, ?, ?, ?, ?)',
    [
      req.body.title,
      req.body.making_time,
      req.body.serves,
      req.body.ingredients,
      req.body.cost,
    ],
    function (err, results, fields) {
      let fullRequired = [req.body.title, req.body.making_time, req.body.serves, req.body.ingredients, req.body.cost].every(v => !!v === true)
      if(err || !fullRequired) {
        console.log(err)
        return res.status(200).json(
          {
            "message": "Recipe creation failed!",
            "required": "title, making_time, serves, ingredients, cost"
          }
        )
      }
      con.query(`SELECT * FROM recipes WHERE id = ?`, results.insertId,
        (err, result) => {
          result[0].cost = result[0].cost.toString()
          return res.status(200).json(
            {
              message: "Recipe successfully created!",
              recipes: result 
            }
          )
        }
      )
    }
  )
)

app.get('/recipes/:id', (req, res) => con.query(`SELECT id, title, making_time, serves, ingredients, cost  FROM recipes WHERE id = ?`,
  [req.params.id],
  function (err, result) {
    console.log(err)
    result[0].cost = result[0].cost.toString()
    return res.json(
      {
        message: "Recipe details by id",
        recipie: result
      }
    )
  }
))

app.patch('/recipes/:id', (req, res) => con.query(`UPDATE recipes SET title = ?, making_time = ?, serves = ?, ingredients = ?, cost = ? WHERE id = ?`,
  [
    req.body.title,
    req.body.making_time,
    req.body.serves,
    req.body.ingredients,
    req.body.cost,
    req.params.id,
  ],
  function(err, results) {
    console.log(err)
    con.query(`SELECT * FROM recipes WHERE id = ?`, [err ? 1 : req.params.id],
      (err, result) => {
        console.log(err)
        result[0].cost = result[0].cost.toString()
        let { title, making_time, serves, ingredients, cost } = result[0]
        return res.json(
          {
            message: "Recipe successfully updated!",
            recipes: [
              { title, making_time, serves, ingredients, cost }
            ]
          }
        )
      }
    )
  })
)

app.delete('/recipes/:id', (req, res) => con.query('DELETE FROM recipes WHERE id = ?', req.params.id,
  function (err, result) {
    console.log(err)
    if(result.affectedRows === 0) {
      return res.json(
        { "message":"No Recipe found" }
      )
    }
    return res.json(
      {  "message": "Recipe successfully removed!" }
    )
  }
))


app.listen(app.listen(process.env.PORT || 3000), () => console.log(`Example app listening!`))