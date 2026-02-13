import express from 'express';

const app = express();

app.use(express.json());

// Ruta principal
app.get('/', (req, res) => {
  res.json({ mensaje: 'API funcionando correctamente' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});


app.get('/recurso', (req, res) => {
  res.json({ metodo: 'GET' });
});

// POST
app.post('/recurso', (req, res) => {
  res.json({ metodo: 'POST', body: req.body });
});

// PUT
app.put('/recurso/:id', (req, res) => {
  res.json({ metodo: 'PUT', id: req.params.id });
});

// DELETE
app.delete('/recurso/:id', (req, res) => {
  res.json({ metodo: 'DELETE', id: req.params.id });
});

// Parámetros
app.get('/cursos/:categoria/:id', (req, res) => {
  const { categoria, id } = req.params;
  res.json({ categoria, id });
});

// Query params
app.get('/cursos', (req, res) => {
  res.json({ filtros: req.query });
});

export default app;
