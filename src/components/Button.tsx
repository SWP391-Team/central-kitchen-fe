import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
}

const Button = ({ children, variant = 'primary', ...props }: ButtonProps) => {
  const styles = {
    base: {
      padding: '0.5rem 1rem',
      borderRadius: '0.25rem',
      border: 'none',
      cursor: 'pointer',
      fontSize: '1rem',
      fontWeight: '500',
    },
    primary: {
      backgroundColor: '#007bff',
      color: '#fff',
    },
    secondary: {
      backgroundColor: '#6c757d',
      color: '#fff',
    },
    danger: {
      backgroundColor: '#dc3545',
      color: '#fff',
    },
  }

  return (
    <button
      style={{ ...styles.base, ...styles[variant] }}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
