import React from 'react';
import { Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import './Login.css';

const Login: React.FC = () => {
  return (
    <div className="login-container">
      <motion.div 
        className="login-card"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="logo-wrapper">
          <div className="logo-circle">
            <Sparkles size={30} strokeWidth={2} />
          </div>
        </div>
        
        <h1 className="login-title">Gerenciamento Lumina</h1>
        
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="form-group">
            <label className="form-label">E-mail</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={20} />
              <input 
                type="email" 
                className="login-input" 
                placeholder="nome@empresa.com"
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Senha</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
              <input 
                type="password" 
                className="login-input" 
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div className="forgot-password-container">
            <a href="#" className="forgot-password-link">Esqueci minha senha</a>
          </div>
          
          <button type="submit" className="login-button">
            Acessar Painel
            <ArrowRight size={20} />
          </button>
        </form>
      </motion.div>
    </div>
  );
};


export default Login;
