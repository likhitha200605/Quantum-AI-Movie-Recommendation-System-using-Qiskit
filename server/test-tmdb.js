import axios from 'axios';
axios.get('https://api.tmdb.org/3/trending/movie/week?api_key=4e44d9029b1270a757cddc766a1bcb63')
  .then(res => console.log('Success, length:', res.data.results.length))
  .catch(err => console.error('Error:', err.message));
