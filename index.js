import express from "express";
import mysql from "mysql";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "eassykas",
})

app.get('/tabsiswa', (req, res) => {
    const sql = "SELECT * FROM siswa";
    db.query(sql, (err, data) => {
        if (err) {
            return res.json({Error: "Error"})
        }
        return res.json(data)
    })
})

app.post('/tabsiswa/create', (req, res) => {
    const sql = "INSERT INTO siswa (nama_siswa, status) VALUES (?)";
    const values = [
        req.body.nama_siswa,
        req.body.status
    ]
    db.query(sql,[values] , (err, data) => {
        if (err) {
            return res.json({Error: "Error"})
        }
        return res.json(data)
    })
})

app.put('/tabsiswa/update/:id', (req, res) => {
    const sql = "update siswa set nama_siswa = ?, status = ? where id = ?";

    const values = [
        req.body.nama_siswa,
        req.body.status
    ]
    const id = req.params.id;
    db.query(sql,[...values, id] , (err, data) => {
        if (err) {
            return res.json({Error: "Error"})
        }
        return res.json(data)
    })
})

app.delete('/tabsiswa/delete/:id', (req, res) => {
    const sql = "delete from siswa where id = ?";
    const id = req.params.id;
    db.query(sql,[id] , (err, data) => {
        if (err) {
            return res.json({Error: "Error"})
        }
        return res.json(data)
    })
})

app.get('/tabsiswa/getrecord/:id', (req, res) => {
    const sql = "SELECT * FROM siswa where id = ?";
    const id = req.params.id;
    db.query(sql,[id] , (err, data) => {
        if (err) {
            return res.json({Error: "Error"})
        }
        return res.json(data)
    })
})

app.listen(3030, () => {
    console.log("server sudah berjalan");
})