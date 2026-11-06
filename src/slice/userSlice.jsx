import { createSlice } from '@reduxjs/toolkit';
import { loadSessionUser } from '../lib/auth';

const signedOutState = {
  id: null,
  name: '',
  email: '',
  role: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState: { ...signedOutState, ...loadSessionUser() },
  reducers: {
    setUser(state, action) {
      return { ...state, ...action.payload };
    },
    logout() {
      return signedOutState;
    }
  },
});

export const { setUser, logout } = userSlice.actions;
export default userSlice.reducer;
