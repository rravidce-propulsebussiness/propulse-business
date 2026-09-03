import { useEffect, useState } from 'react';
import { getToken, clearSession } from '../../utils/auth';
import { useNavigate } from 'react-router-dom';
import './AdminTable.css';
import './AdminPayments.css';

const API = 'http://localhost:5000/api';

export default function AdminPayments(){