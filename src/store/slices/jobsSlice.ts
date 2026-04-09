import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchJobs = createAsyncThunk('jobs/fetchJobs', async () => {
  const response = await fetch('/api/jobs');
  const data = await response.json();
  return data.data; // array of jobs
});

export const fetchMyJobs = createAsyncThunk('jobs/fetchMyJobs', async () => {
  const response = await fetch('/api/jobs?myJobs=true');
  if (!response.ok) throw new Error('Failed to fetch your jobs');
  const data = await response.json();
  return data.data; // array of user's jobs
});

export const fetchJobById = createAsyncThunk('jobs/fetchJobById', async (id: string) => {
  const response = await fetch(`/api/jobs/${id}`);
  if (!response.ok) throw new Error('Failed to fetch job');
  const data = await response.json();
  return data.data;
});

export const createJob = createAsyncThunk('jobs/createJob', async (jobData: any, { rejectWithValue }) => {
  try {
    const response = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jobData),
    });

    const data = await response.json();

    if (!response.ok) {
      return rejectWithValue(data.error || 'Failed to create job');
    }

    return data.data;
  } catch (error: any) {
    return rejectWithValue(error.message || 'Failed to create job');
  }
});

export const updateJob = createAsyncThunk('jobs/updateJob', async ({ id, jobData }: { id: string; jobData: any }) => {
  const response = await fetch(`/api/jobs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(jobData),
  });
  if (!response.ok) throw new Error('Failed to update job');
  const data = await response.json();
  return data.data;
});

export const deleteJob = createAsyncThunk('jobs/deleteJob', async (id: string) => {
  const response = await fetch(`/api/jobs/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete job');
  const data = await response.json();
  return data.data;
});

interface JobsState {
  items: any[];
  currentJob: any | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: JobsState = {
  items: [],
  currentJob: null,
  status: 'idle',
  error: null,
};

const jobsSlice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all jobs
      .addCase(fetchJobs.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchJobs.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload || [];
      })
      .addCase(fetchJobs.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch jobs';
      })
      // Fetch my jobs (recruiter's jobs)
      .addCase(fetchMyJobs.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchMyJobs.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload || [];
      })
      .addCase(fetchMyJobs.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch your jobs';
      })
      // Fetch job by ID
      .addCase(fetchJobById.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchJobById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentJob = action.payload;
      })
      .addCase(fetchJobById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch job';
      })
      // Create job
      .addCase(createJob.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(createJob.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items.unshift(action.payload);
      })
      .addCase(createJob.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) || action.error.message || 'Failed to create job';
      })
      // Update job
      .addCase(updateJob.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateJob.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.items.findIndex((job: any) => job._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        state.currentJob = action.payload;
      })
      .addCase(updateJob.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to update job';
      })
      // Delete job
      .addCase(deleteJob.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(deleteJob.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = state.items.filter((job: any) => job._id !== action.payload.job?._id);
      })
      .addCase(deleteJob.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to delete job';
      });
  },
});

export const { clearError } = jobsSlice.actions;
export default jobsSlice.reducer;
