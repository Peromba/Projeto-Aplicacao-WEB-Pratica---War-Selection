var express = require('express');
var router = express.Router();
const pool = require('../config/db');

// Valida os campos do formulário; retorna a mensagem de erro ou null
function validar(body) {
  const { nome, pais, dano, vida, era } = body;
  const vazio = (v) => v === undefined || v === null || String(v).trim() === '';

  if ([nome, pais, dano, vida, era].some(vazio)) {
    return 'Preencha todos os campos.';
  }
  if (isNaN(Number(dano)) || isNaN(Number(vida)) || Number(dano) < 0 || Number(vida) < 0) {
    return 'Dano e vida devem ser números maiores ou iguais a zero.';
  }
  return null;
}

// GET / -> lista as tropas (com pesquisa opcional: /?busca=texto)
router.get('/', async function (req, res, next) {
  try {
    const busca = (req.query.busca || '').trim();
    let sql = 'SELECT id, nome, pais, dano, vida, era FROM tropa';
    const params = [];

    if (busca) {
      sql += ' WHERE nome LIKE ? OR pais LIKE ? OR era LIKE ?';
      const termo = '%' + busca + '%';
      params.push(termo, termo, termo);
    }
    sql += ' ORDER BY id';

    const [tropas] = await pool.query(sql, params);
    res.render('index', {
      tropas: tropas,
      busca: busca,
      erro: req.query.erro || null,
      ok: req.query.ok || null
    });
  } catch (err) {
    next(err);
  }
});

// POST /itens -> cadastra
router.post('/itens', async function (req, res, next) {
  try {
    const erro = validar(req.body);
    if (erro) {
      return res.redirect('/?erro=' + encodeURIComponent(erro));
    }

    const { nome, pais, dano, vida, era } = req.body;
    await pool.query(
      'INSERT INTO tropa (nome, pais, dano, vida, era) VALUES (?, ?, ?, ?, ?)',
      [nome.trim(), pais.trim(), Number(dano), Number(vida), era.trim()]
    );

    res.redirect('/?ok=' + encodeURIComponent('Tropa cadastrada com sucesso!'));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.redirect('/?erro=' + encodeURIComponent('Já existe uma tropa com esse nome.'));
    }
    next(err);
  }
});

// GET /itens/:id/editar -> mostra o formulário de edição
router.get('/itens/:id/editar', async function (req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT id, nome, pais, dano, vida, era FROM tropa WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.redirect('/?erro=' + encodeURIComponent('Tropa não encontrada.'));
    }
    res.render('editar', {
      title: 'Alterar Tropa',
      tropa: rows[0],
      erro: req.query.erro || null
    });
  } catch (err) {
    next(err);
  }
});

// POST /itens/:id/editar -> salva a alteração
router.post('/itens/:id/editar', async function (req, res, next) {
  const id = req.params.id;
  try {
    const erro = validar(req.body);
    if (erro) {
      return res.redirect('/itens/' + id + '/editar?erro=' + encodeURIComponent(erro));
    }

    const { nome, pais, dano, vida, era } = req.body;
    const [resultado] = await pool.query(
      'UPDATE tropa SET nome = ?, pais = ?, dano = ?, vida = ?, era = ? WHERE id = ?',
      [nome.trim(), pais.trim(), Number(dano), Number(vida), era.trim(), id]
    );

    if (resultado.affectedRows === 0) {
      return res.redirect('/?erro=' + encodeURIComponent('Tropa não encontrada.'));
    }
    res.redirect('/?ok=' + encodeURIComponent('Tropa alterada com sucesso!'));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.redirect(
        '/itens/' + id + '/editar?erro=' + encodeURIComponent('Já existe uma tropa com esse nome.')
      );
    }
    next(err);
  }
});

// POST /itens/:id/excluir -> exclui
router.post('/itens/:id/excluir', async function (req, res, next) {
  try {
    const [resultado] = await pool.query('DELETE FROM tropa WHERE id = ?', [req.params.id]);

    if (resultado.affectedRows === 0) {
      return res.redirect('/?erro=' + encodeURIComponent('Tropa não encontrada.'));
    }
    res.redirect('/?ok=' + encodeURIComponent('Tropa excluída com sucesso!'));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
