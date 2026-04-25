import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchApplicants = createAsyncThunk('applicants/fetchApplicants', async () => {
  const response = await fetch('/api/applicants');
  const data = await response.json();
  return data.data;
});

export const fetchMyApplicants = createAsyncThunk('applicants/fetchMyApplicants', async () => {
  const response = await fetch('/api/applicants?myApplicants=true');
  if (!response.ok) throw new Error('Failed to fetch your applicants');
  const data = await response.json();
  return data.data;
});

export const fetchApplicantsByJob = createAsyncThunk(
  'applicants/fetchApplicantsByJob',
  async (jobId: string) => {
    const response = await fetch(`/api/applicants?jobId=${jobId}`);
    const data = await response.json();
    return data.data;
  }
);

export const fetchApplicantById = createAsyncThunk(
  'applicants/fetchApplicantById',
  async (id: string) => {
    const response = await fetch(`/api/applicants/${id}`);
    if (!response.ok) throw new Error('Failed to fetch applicant');
    const data = await response.json();
    return data.data;
  }
);

export const createApplicant = createAsyncThunk(
  'applicants/createApplicant',
  async (applicantData: any) => {
    const response = await fetch('/api/applicants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(applicantData),
    });
    if (!response.ok) throw new Error('Failed to create applicant');
    const data = await response.json();
    return data.data;
  }
);

export const updateApplicant = createAsyncThunk(
  'applicants/updateApplicant',
  async ({ id, applicantData }: { id: string; applicantData: any }) => {
    const response = await fetch(`/api/applicants/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(applicantData),
    });
    if (!response.ok) throw new Error('Failed to update applicant');
    const data = await response.json();
    return data.data;
  }
);

export const deleteApplicant = createAsyncThunk(
  'applicants/deleteApplicant',
  async (id: string) => {
    const response = await fetch(`/api/applicants/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete applicant');
    const data = await response.json();
    return data.data;
  }
);

interface ApplicantsState {
  items: any[];
  currentApplicant: any | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: ApplicantsState = {
  items: [],
  currentApplicant: null,
  status: 'idle',
  error: null,
};

const applicantsSlice = createSlice({
  name: 'applicants',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all applicants
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
      })
      // Fetch my applicants (recruiter's applicants)
      .addCase(fetchMyApplicants.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchMyApplicants.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload || [];
      })
      .addCase(fetchMyApplicants.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch your applicants';
      })
      // Fetch applicants by job
      .addCase(fetchApplicantsByJob.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchApplicantsByJob.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload || [];
      })
      .addCase(fetchApplicantsByJob.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch applicants';
      })
      // Fetch applicant by ID
      .addCase(fetchApplicantById.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchApplicantById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentApplicant = action.payload;
      })
      .addCase(fetchApplicantById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch applicant';
      })
      // Create applicant
      .addCase(createApplicant.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(createApplicant.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items.unshift(action.payload);
      })
      .addCase(createApplicant.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to create applicant';
      })
      // Update applicant
      .addCase(updateApplicant.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateApplicant.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.items.findIndex((app: any) => app._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        state.currentApplicant = action.payload;
      })
      .addCase(updateApplicant.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to update applicant';
      })
      // Delete applicant
      .addCase(deleteApplicant.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(deleteApplicant.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = state.items.filter((app: any) => app._id !== action.payload.applicant?._id);
      })
      .addCase(deleteApplicant.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to delete applicant';
      });
  },
});

export const { clearError } = applicantsSlice.actions;
export default applicantsSlice.reducer;
