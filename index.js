import express from 'express';
import mysql from 'mysql';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'eassykas',
});

app.listen(3030, () => {
  console.log('Server sudah berjalan');
});

app.get('/getSaldoInfo', (req, res) => {
  const pemasukanQuery = `
      SELECT COUNT(id) * 2000 AS total
      FROM status_siswa
      WHERE status = '1'
    `;

  const pengeluaranQuery = `
      SELECT COUNT(id) * 2000 AS total
      FROM status_siswa
      WHERE status = '0'
    `;

  // Eksekusi kedua query secara paralel
  Promise.all([
    new Promise((resolve) =>
      db.query(pemasukanQuery, (err, r) => resolve(r[0]?.total || 0))
    ),
    new Promise((resolve) =>
      db.query(pengeluaranQuery, (err, r) => resolve(r[0]?.total || 0))
    ),
  ])
    .then(([pemasukan, pengeluaran]) => {
      const saldo = pemasukan - pengeluaran;
      return res.json({
        pemasukan,
        pengeluaran,
        saldo,
      });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    });
});

app.get('/tabSiswa', (req, res) => {
  const sql = 'SELECT * FROM siswa';
  db.query(sql, (err, data) => {
    if (err) {
      return res.json({ error: 'Error' });
    }
    return res.json(data);
  });
});

app.post('/tabSiswa/create', (req, res) => {
  const sql = 'INSERT INTO siswa (nisn, nama, kelas, status) VALUES (?)';
  const values = [
    req.body.nisn,
    req.body.nama,
    req.body.kelas,
    req.body.status || '1', // Default status '1' jika tidak disediakan
  ];

  db.query(sql, [values], (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error creating siswa' });
    }
    return res.json({
      success: true,
      id: data.insertId,
    });
  });
});

app.put('/tabSiswa/update/:id', (req, res) => {
  const sql = 'UPDATE siswa SET nama = ?, status = ? WHERE id = ?';
  const values = [
    req.body.nisn,
    req.body.nama,
    req.body.kelas,
    req.body.status,
  ];
  const id = req.params.id;
  db.query(sql, [...values, id], (err, data) => {
    if (err) {
      return res.json({ error: 'Error' });
    }
    return res.json(data);
  });
});

app.delete('/tabSiswa/delete/:id', (req, res) => {
  const sql = 'UPDATE siswa SET status = 99 WHERE id = ?';
  const id = req.params.id;
  db.query(sql, [id], (err, data) => {
    if (err) {
      return res.json({ error: 'Error' });
    }
    return res.json(data);
  });
});

app.get('/tabSiswa/getRecord/:id', (req, res) => {
  const sql = 'SELECT * FROM siswa WHERE id = ?';
  const id = req.params.id;
  db.query(sql, [id], (err, data) => {
    if (err) {
      return res.json({ error: 'Error' });
    }
    return res.json(data);
  });
});

app.get('/bulan/get', (req, res) => {
  const sql = `
      SELECT 
        b.id,
        b.nama AS bulan,
        b.tahun,
        b.total,
        COUNT(ss.id) * 2000 AS total_pemasukan
      FROM 
        bulan b
      LEFT JOIN 
        minggu m ON b.id = m.id_bulan
      LEFT JOIN 
        status_siswa ss ON m.id = ss.id_minggu AND ss.status = '1'
      WHERE 
        b.status = '1'
      GROUP BY 
        b.id, b.nama, b.tahun, b.total
    `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error fetching active months' });
    }
    return res.json(results);
  });
});

app.put('/bulan/delete/:id', (req, res) => {
  const { id } = req.params;

  // Pertama update status bulan menjadi 99
  const updateBulanSql = 'UPDATE bulan SET status = "99" WHERE id = ?';

  // Kemudian update semua minggu terkait (jika diperlukan)
  const updateMingguSql = 'UPDATE minggu SET status = "99" WHERE id_bulan = ?';

  db.beginTransaction((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error starting transaction' });
    }

    // Update status bulan
    db.query(updateBulanSql, [id], (err, result) => {
      if (err) {
        return db.rollback(() => {
          console.error(err);
          res.status(500).json({ error: 'Error updating bulan status' });
        });
      }

      // Update status minggu terkait (opsional)
      db.query(updateMingguSql, [id], (err, result) => {
        if (err) {
          return db.rollback(() => {
            console.error(err);
            res.status(500).json({ error: 'Error updating minggu status' });
          });
        }

        db.commit((err) => {
          if (err) {
            return db.rollback(() => {
              console.error(err);
              res.status(500).json({ error: 'Error committing transaction' });
            });
          }

          return res.json({
            success: true,
            message: 'Bulan dan minggu terkait berhasil dinonaktifkan',
          });
        });
      });
    });
  });
});

app.post('/bulan/create', (req, res) => {
  const { nama, tahun } = req.body;

  if (!nama || !tahun) {
    return res.status(400).json({ error: 'Nama bulan dan tahun harus diisi' });
  }

  const sql = 'INSERT INTO bulan (nama, tahun, status) VALUES (?, ?, "1")';

  db.query(sql, [nama, tahun], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error creating new month' });
    }

    return res.json({
      success: true,
      id: result.insertId,
      message: 'Bulan baru berhasil ditambahkan',
    });
  });
});

app.get('/status-siswa/by-bulan/:id_bulan', (req, res) => {
  const { id_bulan } = req.params;

  const sql = `
      SELECT 
        ss.id,
        s.nisn,
        s.nama AS nama_siswa,
        s.kelas,
        m.minggu,
        ss.status AS status_siswa
      FROM 
        status_siswa ss
      JOIN 
        siswa s ON ss.id_siswa = s.id
      JOIN 
        minggu m ON ss.id_minggu = m.id
      WHERE 
        m.id_bulan = ?
        AND s.status = '1'
      ORDER BY 
        s.nama, m.minggu
    `;

  db.query(sql, [id_bulan], (err, results) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ error: 'Error fetching status siswa data' });
    }

    // Format data untuk response
    const formattedResults = results.map((item) => ({
      id: item.id,
      nisn: item.nisn,
      nama_siswa: item.nama_siswa,
      kelas: item.kelas,
      minggu: item.minggu,
      status: item.status_siswa === '1' ? true : false,
    }));

    return res.json({
      success: true,
      data: formattedResults,
      count: results.length,
    });
  });
});

app.put('/status-siswa/toggle/:id', (req, res) => {
  const { id } = req.params;

  // Validasi ID
  if (!id || isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID status siswa tidak valid',
    });
  }

  // Query untuk toggle status (1 jadi 0, 0 jadi 1)
  const sql = `
      UPDATE status_siswa 
      SET status = CASE 
                    WHEN status = '1' THEN '0' 
                    ELSE '1' 
                  END
      WHERE id = ?
    `;

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        success: false,
        message: 'Gagal mengupdate status siswa',
        error: err.message,
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Data tidak ditemukan',
      });
    }

    // Query untuk mendapatkan data terbaru
    const getUpdatedSql = 'SELECT id, status FROM status_siswa WHERE id = ?';
    db.query(getUpdatedSql, [id], (err, updatedResult) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message:
            'Status berhasil diupdate tetapi gagal mengambil data terbaru',
          affectedRows: result.affectedRows,
        });
      }

      return res.json({
        success: true,
        message: 'Status siswa berhasil diupdate',
        newStatus: updatedResult[0].status === '1' ? true : false,
        affectedRows: result.affectedRows,
      });
    });
  });
});

// Get semua pengeluaran aktif (status=1)
app.get('/pengeluaran', (req, res) => {
  const sql = `
      SELECT 
        id, 
        DATE_FORMAT(tanggal, '%Y-%m-%d') AS tanggal, 
        keterangan, 
        total
      FROM 
        pengeluaran
      WHERE 
        status = '1'
      ORDER BY 
        tanggal DESC
    `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error fetching pengeluaran data' });
    }

    return res.json({
      success: true,
      data: results,
      count: results.length,
    });
  });
});

// Get pengeluaran by ID
app.get('/pengeluaran/:id', (req, res) => {
  const { id } = req.params;

  const sql = `
      SELECT 
        id, 
        DATE_FORMAT(tanggal, '%Y-%m-%d') AS tanggal, 
        keterangan, 
        total
      FROM 
        pengeluaran
      WHERE 
        id = ? 
        AND status = '1'
    `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error fetching pengeluaran data' });
    }

    if (results.length === 0) {
      return res
        .status(404)
        .json({ error: 'Data pengeluaran tidak ditemukan' });
    }

    return res.json({
      success: true,
      data: results[0],
    });
  });
});

app.post('/pengeluaran', (req, res) => {
  const { tanggal, keterangan, total } = req.body;

  // Validasi input
  if (!tanggal || !keterangan || !total) {
    return res
      .status(400)
      .json({ error: 'Tanggal, keterangan dan total harus diisi' });
  }

  if (isNaN(total) || total <= 0) {
    return res.status(400).json({ error: 'Total harus berupa angka positif' });
  }

  const sql = `
      INSERT INTO pengeluaran 
        (tanggal, keterangan, total, status) 
      VALUES 
        (?, ?, ?, '1')
    `;

  db.query(sql, [tanggal, keterangan, total], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error creating pengeluaran' });
    }

    return res.json({
      success: true,
      message: 'Data pengeluaran berhasil ditambahkan',
      id: result.insertId,
    });
  });
});

app.put('/pengeluaran/:id', (req, res) => {
  const { id } = req.params;
  const { tanggal, keterangan, total } = req.body;

  // Validasi input
  if (!tanggal || !keterangan || !total) {
    return res
      .status(400)
      .json({ error: 'Tanggal, keterangan dan total harus diisi' });
  }

  if (isNaN(total) || total <= 0) {
    return res.status(400).json({ error: 'Total harus berupa angka positif' });
  }

  const sql = `
      UPDATE pengeluaran 
      SET 
        tanggal = ?, 
        keterangan = ?, 
        total = ?
      WHERE 
        id = ? 
        AND status = '1'
    `;

  db.query(sql, [tanggal, keterangan, total, id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error updating pengeluaran' });
    }

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: 'Data pengeluaran tidak ditemukan' });
    }

    return res.json({
      success: true,
      message: 'Data pengeluaran berhasil diupdate',
      affectedRows: result.affectedRows,
    });
  });
});

app.delete('/pengeluaran/:id', (req, res) => {
  const { id } = req.params;

  const sql = `
      UPDATE pengeluaran 
      SET 
        status = '99'
      WHERE 
        id = ? 
        AND status = '1'
    `;

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error deleting pengeluaran' });
    }

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: 'Data pengeluaran tidak ditemukan' });
    }

    return res.json({
      success: true,
      message: 'Data pengeluaran berhasil dihapus',
      affectedRows: result.affectedRows,
    });
  });
});
