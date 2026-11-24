import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '@/lib/api';

export const fetchJobs = createAsyncThunk('jobs/fetchJobs', async () => {
  const data = await apiFetch<{ success: boolean; data: any[] }>('/jobs');
  return data.data;
});

export const fetchMyJobs = createAsyncThunk('jobs/fetchMyJobs', async () => {
  const data = await apiFetch<{ success: boolean; data: any[] }>('/jobs?myJobs=true');
  return data.data;
});

export const fetchJobById = createAsyncThunk('jobs/fetchJobById', async (id: string) => {
  const data = await apiFetch<{ success: boolean; data: any }>(`/jobs/${id}`);
  return data.data;
});

export const createJob = createAsyncThunk(
  'jobs/createJob',
  async (jobData: any, { rejectWithValue }) => {
    try {
      const data = await apiFetch<{ success: boolean; data: any }>('/jobs', {
        method: 'POST',
        body: JSON.stringify(jobData),
      });
      return data.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create job');
    }
  }
);

export const updateJob = createAsyncThunk(
  'jobs/updateJob',
  async ({ id, jobData }: { id: string; jobData: any }, { rejectWithValue }) => {
    try {
      const data = await apiFetch<{ success: boolean; data: any }>(`/jobs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(jobData),
      });
      return data.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update job');
    }
  }
);

export const deleteJob = createAsyncThunk(
  'jobs/deleteJob',
  async (id: string, { rejectWithValue }) => {
    try {
      const data = await apiFetch<{ success: boolean; data: { id: string; message: string } }>(
        `/jobs/${id}`,
        { method: 'DELETE' }
      );
      return { ...data.data, id };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete job');
    }
  }
);

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
        state.error = (action.payload as string) || action.error.message || 'Failed to update job';
      })
      .addCase(deleteJob.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(deleteJob.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const deletedId = action.payload?.id || action.meta.arg;
        state.items = state.items.filter((job: any) => job._id !== deletedId && job.id !== deletedId);
      })
      .addCase(deleteJob.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) || action.error.message || 'Failed to delete job';
      });
  },
});

export const { clearError } = jobsSlice.actions;
export default jobsSlice.reducer;
