const express = require('express')
const cors = require('cors');
const petRouter = require('./routes/pet.route')
const PORT = process.env.PORT || 8080

const app = express()

app.use(cors()); 
app.use(express.json())
app.use('/api', petRouter)

app.get('/', (req, res) => {
    res.send('Hello Wld');
});

app.listen(PORT, () => console.log(`server started on post ${PORT}`))