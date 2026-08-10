const prisma = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

module.exports = {
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
      }

      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        return res.status(401).json({ error: 'Usuário ou senha inválidos' });
      }

      const checkPassword = await bcrypt.compare(password, user.password);
      if (!checkPassword) {
        return res.status(401).json({ error: 'Usuário ou senha inválidos' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      return res.json({
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        token
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro interno no servidor' });
    }
  },

  async me(req, res) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { id: true, name: true, email: true, role: true }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      return res.json(user);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro interno no servidor' });
    }
  }
};
