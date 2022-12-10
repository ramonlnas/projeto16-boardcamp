import dotenv from "dotenv";
import express from "express";
import joi from "joi";
import connection from "./database.js";

const categorySchema = joi.object({
  name: joi.string().min(1).required(),
});

const gameSchema = joi.object({
  name: joi.string().min(1).required(),
  image: joi.string().min(1).required(),
  stockTotal: joi.number().min(1).required(),
  pricePerDay: joi.number().min(1).required(),
  categoryId: joi.number().min(1).required(),
});

const userSchema = joi.object({
  name: joi.string().min(1).required(),
  phone: joi.string().min(10).max(11).required(),
  cpf: joi.string().min(11).max(11),
  birthday: joi.string().isoDate().required(),
});

dotenv.config();
const app = express();
app.use(express.json());

app.get("/categories", async (req, res) => {
  try {
    const getCategories = await connection.query("SELECT * FROM categories;");
    res.status(201).send(getCategories.rows);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.post("/categories", async (req, res) => {
  const name = req.body;

  const validation = categorySchema.validate(name, { abortEarly: false });

  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    return res.status(422).send(errors);
  }

  try {
    const nameExist = await connection.query(
      "SELECT * FROM categories WHERE name=$1",
      [name.name]
    );
    console.log(nameExist);

    if (nameExist.rows.length !== 0) {
      return res
        .status(409)
        .send({ message: "Essa categoria já está cadastrada" });
    }

    await connection.query("INSERT INTO categories (name) VALUES ($1)", [
      name.name,
    ]);
    res.sendStatus(201);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.get("/games", async (req, res) => {
  const { name } = req.query;

  try {
    const filterGames = await connection.query(
      `SELECT * FROM games WHERE name ILIKE '${name}%'`
    );
    if (name) {
      return res.send(filterGames.rows);
    }

    const getGames =
      await connection.query(`SELECT games.*, categories.name AS "categoryName" FROM
      games JOIN categories ON games."categoryId" = categories.id;
    `);
    res.send(getGames.rows);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.post("/games", async (req, res) => {
  const value = req.body;

  const validation = gameSchema.validate(value, { abortEarly: false });

  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    return res.status(422).send(errors);
  }

  try {
    const existCategoryId = await connection.query(
      `SELECT * FROM categories WHERE id=$1;`,
      [value.categoryId]
    );

    const existName = await connection.query(
      "SELECT * FROM games WHERE name=$1",
      [value.name]
    );

    if (existCategoryId.rows.length === 0) {
      return res.sendStatus(400);
    }

    if (existName.rows.length !== 0) {
      return res.sendStatus(409);
    }

    await connection.query(
      `INSERT INTO games (name, image, "stockTotal", "categoryId", "pricePerDay") VALUES ($1, $2, $3, $4, $5)`,
      [
        value.name,
        value.image,
        value.stockTotal,
        value.categoryId,
        value.pricePerDay,
      ]
    );
    res.sendStatus(201);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.get("/customers", async (req, res) => {
  const { cpf } = req.query;
  try {
    const filterCPF = await connection.query(
      `SELECT * FROM customers WHERE cpf ILIKE '${cpf}%'`
    );
    const getCostumers = await connection.query(`SELECT * FROM customers;`);

    if (cpf) {
      return res.send(filterCPF.rows);
    }

    res.send(getCostumers.rows);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.get("/customers/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const customerId = connection.query(
      `SELECT * FROM customers WHERE id=$1}`,
      [id]
    );
    res.send(customerId);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.post("/customers", async (req, res) => {
  const user = req.body;

  const validation = userSchema.validate(user, { abortEarly: false });

  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    return res.status(400).send(errors);
  }

  try {
    const existCPF = await connection.query(
      `SELECT (cpf) FROM customers WHERE cpf=$1`,
      [user.cpf]
    );

    console.log(existCPF);
    if (existCPF.rows.length !== 0) {
      return res.sendStatus(409);
    }

    await connection.query(
      `INSERT INTO customers (name, phone, cpf, birthday) VALUES ($1, $2, $3, $4)`,
      [user.name, user.phone, user.cpf, user.birthday]
    );
    res.sendStatus(201);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.put("/customers/:id", async (req, res) => {
  const { id } = req.params;
  const user = req.body;

  const validation = userSchema.validate(user, { abortEarly: false });

  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    return res.status(400).send(errors);
  }

  try {
    const existCPF = await connection.query(
      `SELECT (cpf) FROM customers WHERE cpf=$1`,
      [user.cpf]
    );

    console.log(existCPF);
    if (existCPF.rows.length !== 0) {
      return res.sendStatus(409);
    }

    await connection.query(
      `UPDATE customers SET name=$1, phone=$2, cpf=$3, birthday=$4 WHERE id=${id}`,
      [user.name, user.phone, user.cpf, user.birthday]
    );
    res.sendStatus(201);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});


const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Server running in port ${port}`));
