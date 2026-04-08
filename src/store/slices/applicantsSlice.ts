import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchApplicants = createAsyncThunk('applicants/fetchApplicants', async () => {
  const response = await fetch('/api/applicants');
  const data = await response.json();
  return data.data;
});

const applicantsSlice = createSlice({
  name: 'applicants',
  initialState: {
    items: [],
    status: 'idle',
    error: null as string | null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchApplicants.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchApplicants.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload || [];
      })
      .addCase(fetchApplicants.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch applicants';
      });
  },
});

export default applicantsSlice.reducer;
