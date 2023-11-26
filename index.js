const express = require("express");
const cors = require("cors");
const cron = require("node-cron");

const port = 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://turf:9t7s8TWNwTJpfZWc@cluster0.xk69pxb.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    const usersCollection = client.db("Turf").collection("user");
    const notificationCollection = client.db("Turf").collection("notification");
    const turfCollection = client.db("Turf").collection("TurfInfo");
    const bookingCollection = client.db("Turf").collection("booking");
    const holdCollection = client.db("Turf").collection("hold");
    app.get("/users", async (req, res) => {
      let query = {};
      if (req.query.email) {
        query = { email: req.query.email };
      }
      if (req.query.role) {
        query = { role: req.query.role };
      }
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    app.patch("/users/verify", async (req, res) => {
      const email = req.query.email;
      const filter = { email: email };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          varify: "True",
        },
      };
      const result = await usersCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    app.post("/notification", async (req, res) => {
      const msg = req.body;
      const result = await notificationCollection.insertOne(msg);
      res.send(result);
    });
    app.get("/notification", async (req, res) => {
      let query = {};
      if (req.query.email) {
        query = { email: req.query.email };
      }
      const result = await notificationCollection.find(query).toArray();
      res.send(result);
    });
    app.delete("/notification/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await notificationCollection.deleteOne(query);
      res.send(result);
    });

    // Eron
    app.get("/allTurf", async (req, res) => {
      const date = req.query.date;
      let query = {};
      const options = await turfCollection.find(query).toArray();
      const bookingQuery = { bookingDate: date };
      let alreadyBooked = await bookingCollection.find(bookingQuery).toArray();
      const holdData = await holdCollection.find(bookingQuery).toArray();
      alreadyBooked.push(...holdData);
      options.forEach((option) => {
        const optionBooked = alreadyBooked.filter(
          (book) => book.turfName === option.name
        );
        const bookedSlots = optionBooked.map((book) => book.slot);
        const remainingSlots = option.slots.filter(
          (slot) => !bookedSlots.includes(slot)
        );
        option.slots = remainingSlots;
      });
      res.send(options);
    });
    // search by name start-->
    app.get("/searchTurf", async (req, res) => {
      const date = req.query.date;
      const name = req.query.name;
      const upperCase = name.toUpperCase();
      let query = {
        // name: { $regex: new RegExp(upperCase, "i") },
        name: upperCase,
      };
      const options = await turfCollection.find(query).toArray();
      const bookingQuery = { bookingDate: date };
      const alreadyBooked = await bookingCollection
        .find(bookingQuery)
        .toArray();
      options.forEach((option) => {
        const optionBooked = alreadyBooked.filter(
          (book) => book.turfName === option.name
        );
        const bookedSlots = optionBooked.map((book) => book.slot);
        const remainingSlots = option.slots.filter(
          (slot) => !bookedSlots.includes(slot)
        );
        option.slots = remainingSlots;
      });
      res.send(options);
      console.log("t", options);
    });
    // search by name end--->
    // search by location start-->
    app.get("/searchLocation", async (req, res) => {
      const date = req.query.date;
      const location = req.query.location;
      let query = {
        location: location,
      };
      const options = await turfCollection.find(query).toArray();
      const bookingQuery = { bookingDate: date };
      const alreadyBooked = await bookingCollection
        .find(bookingQuery)
        .toArray();
      options.forEach((option) => {
        const optionBooked = alreadyBooked.filter(
          (book) => book.turfName === option.name
        );
        const bookedSlots = optionBooked.map((book) => book.slot);
        const remainingSlots = option.slots.filter(
          (slot) => !bookedSlots.includes(slot)
        );
        option.slots = remainingSlots;
      });
      console.log(options);
      res.send(options);
    });
    // search by location end--->
    app.post("/booking", async (req, res) => {
      const data = req.body;
      const result = await bookingCollection.insertOne(data);
      res.send(result);
      console.log(result);
    });

    // hold start-->
    app.post("/hold", async (req, res) => {
      const data = req.body;
      data.createdAt = new Date();

      const result = await holdCollection.insertOne(data);
      cleanupJob.start();

      res.send(result);
    });
    const cleanupJob = cron.schedule(
      "*/1 * * * *",
      async () => {
        const thirtySecondsAgo = new Date();
        thirtySecondsAgo.setSeconds(thirtySecondsAgo.getSeconds() - 30);

        try {
          // Find and remove documents older than 30 seconds
          const result = await holdCollection.deleteMany({
            createdAt: { $lt: thirtySecondsAgo },
          });
          console.log(`${result.deletedCount} document(s) deleted.`);
        } catch (error) {
          console.error("Error deleting documents:", error);
        }
      },
      {
        scheduled: false, // The job will not run immediately after scheduling
      }
    );

    app.get("/booking", async (req, res) => {
      let query = {};
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });
  } finally {
  }
}
run().catch(console.log);

app.get("/", async (req, res) => {
  res.send("Turf server is running");
});

app.listen(port, () => console.log(`Turf server is running on ${port}`));
