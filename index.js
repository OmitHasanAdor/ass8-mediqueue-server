const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
const cors = require('cors');
const app = express();

// Adds headers: Access-Control-Allow-Origin: *
app.use(cors());
app.use(express.json())
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const uri = process.env.MONGO_DB_URI;

const port = process.env.PORT || 5000;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


 const JWKS = createRemoteJWKSet(
      new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
    );

const verifyToken = async (req, res, next) => {
    const authHeader = req?.headers.authorization
    console.log('authHeader', authHeader)
    // console.log('token', token)
    if (!authHeader) {
      return  res.status(401).send({ message: 'Unauthorized' })
    }
    const token =authHeader.split(' ')[1]
    if (!token) {
         return res.status(401).send({ message: 'Unauthorized' })
    }

    try {
          const { payload } = await jwtVerify(token, JWKS)
          console.log('payload', payload)
          next()
    } catch (error) {
        return res.status(401).send({ message: 'Unauthorized' })
    }

}


const run = async () => {
    try {
        const db = client.db("mediqueue-db");
        const tutorsCollection = db.collection("tutors");
        const bookingsCollection = db.collection("bookings");


        app.get("/tutors", async (req, res) => {
            try {
                const { search, startDate, endDate } = req.query;
                let query = {};
                if (search) {
                    query.tutorName = { $regex: search, $options: "i" };
                }
                if (startDate || endDate) {
                    query.sessionStartDate = {};
                    if (startDate) {
                        query.sessionStartDate.$gte = new Date(`${startDate}T00:00:00.000Z`);
                    }
                    if (endDate) {
                        query.sessionStartDate.$lte = new Date(`${endDate}T23:59:59.999Z`);
                    }
                }
                const result = await tutorsCollection.find(query).toArray();
                res.send(result);

            } catch (error) {
                console.error("Error fetching filtered tutors:", error);
                res.status(500).send({ message: "Internal Server Error" });
            }
        });
        app.get('/available-tutors', async (req, res) => {
            const result = await tutorsCollection.find().limit(6).toArray()
            // console.log(result)
            res.send(result)
        })
        app.get('/tutors/:id',verifyToken, async (req, res) => {
            const { id } = req.params;
            const result = await tutorsCollection.findOne({ _id: new ObjectId(id) });
            //    console.log('result', result)
            res.send(result);
        });
        app.get("/my-tutors",verifyToken, async (req, res) => {
            const email = req.query.email;

            const result = await tutorsCollection
                .find({ userEmail: email })
                .toArray();
            // console.log(result)
            res.send(result);
        });
        app.get("/my-booked-sessions",verifyToken, async (req, res) => {
            const email = req.query.email;


            const result = await bookingsCollection
                .find({
                    userEmail: email,
                })
                .toArray();

            res.send(result);
        });
        app.post('/tutors',verifyToken, async (req, res) => {
            const tutorData = await req.body;
            tutorData.totalSlot = Number(tutorData.totalSlot);
            tutorData.sessionStartDate = new Date(tutorData.sessionStartDate);
            const result = await tutorsCollection.insertOne(tutorData)
            // console.log(result)
            res.send(result)
        })

        app.delete('/tutors/:id', async (req, res) => {
            try {
                const id = req.params.id;
                if (!ObjectId.isValid(id)) {
                    return res.status(400).send({ message: "Invalid ID format" });
                }
                const query = { _id: new ObjectId(id) };
                const result = await tutorsCollection.deleteOne(query);

                if (result.deletedCount === 1) {
                    res.status(200).send({ success: true, message: "Successfully deleted one tutor." });
                } else {
                    res.status(404).send({ success: false, message: "No tutor matches the provided ID." });
                }
            } catch (error) {
                console.error("Backend Tutor Delete Error:", error);
                res.status(500).send({ message: "Internal Server Error" });
            }
        });
        app.patch("/bookings/:id", async (req, res) => {
            const id = req.params.id;

            const result = await bookingsCollection.updateOne(
                { _id: new ObjectId(id) },
                {
                    $set: {
                        status: "cancelled",
                    },
                }
            );
            // console.log(result)
            res.send(result);
        });


        app.patch('/my-tutors/:id', async (req, res) => {
            const id = req.params.id;
            const updatedData = req.body;

            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: updatedData
            };

            const result = await tutorsCollection.updateOne(filter, updateDoc);
            // console.log(result)
            res.send(result);
        });
        app.post('/bookings',verifyToken, async (req, res) => {
            try {

                console.log(req.body);
                const bookingData = req.body;
                const result = await bookingsCollection.insertOne(bookingData);
                await tutorsCollection.updateOne(
                    {
                        _id: new ObjectId(bookingData.tutorId),
                    },
                    {
                        $inc: {
                            totalSlot: -1,
                        },
                    }
                );
                res.send(result);

            } catch (error) {
                console.log("BOOKING ERROR:", error);
                res.status(500).send(error.message);
            }
        });


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