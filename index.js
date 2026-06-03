const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const cors = require('cors');
const app = express();

// Adds headers: Access-Control-Allow-Origin: *
app.use(cors());
app.use(express.json())
const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = process.env.MONGO_DB_URI;

const port = process.env.PORT || 5000;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


const run = async () => {
    try {
        const db = client.db("mediqueue-db");
        const tutorsCollection = db.collection("tutors");
        const bookingsCollection = db.collection("bookings");

        app.get('/tutor', async (req, res) => {
            const result = await tutorsCollection.find().toArray()
            // console.log(result)
            res.send(result)
        })

        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
      
        // await client.close();
    }
}

run().catch(console.dir);
app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})