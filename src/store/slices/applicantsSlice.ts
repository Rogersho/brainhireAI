import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '@/lib/api';

export const fetchApplicants = createAsyncThunk('applicants/fetchApplicants', async () => {
  const data = await apiFetch<{ success: boolean; data: any[] }>('/applicants');
  return data.data;
});

export const fetchMyApplicants = createAsyncThunk('applicants/fetchMyApplicants', async () => {
  const data = await apiFetch<{ success: boolean; data: any[] }>('/applicants');
  return data.data;
});

export const fetchApplicantsByJob = createAsyncThunk(
  'applicants/fetchApplicantsByJob',
  async (jobId: string) => {
    const data = await apiFetch<{ success: boolean; data: any[] }>(`/applicants?jobId=${jobId}`);
    return data.data;
  }
);

export const fetchApplicantById = createAsyncThunk(
  'applicants/fetchApplicantById',
  async (id: string) => {
    const data = await apiFetch<{ success: boolean; data: any }>(`/applicants/${id}`);
    return data.data;
  }
);

export const createApplicant = createAsyncThunk(
  'applicants/createApplicant',
  async (applicantData: any, { rejectWithValue }) => {
    try {
      const data = await apiFetch<{ success: boolean; data: any }>('/applicants', {
        method: 'POST',
        body: JSON.stringify(applicantData),
      });
      return data.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create applicant');
    }
  }
);

export const updateApplicant = createAsyncThunk(
  'applicants/updateApplicant',
  async ({ id, applicantData }: { id: string; applicantData: any }, { rejectWithValue }) => {
    try {
      const data = await apiFetch<{ success: boolean; data: any }>(`/applicants/${id}`, {
        method: 'PUT',
        body: JSON.stringify(applicantData),
      });
      return data.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update applicant');
    }
  }
);

export const deleteApplicant = createAsyncThunk(
  'applicants/deleteApplicant',
  async (id: string, { rejectWithValue }) => {
    try {
      const data = await apiFetch<{ success: boolean; data: { id: string; message: string } }>(
        `/applicants/${id}`,
        { method: 'DELETE' }
      );
      return { ...data.data, id };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete applicant');
    }
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
      .addCase(createApplicant.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(createApplicant.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items.unshift(action.payload);
      })
      .addCase(createApplicant.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) || action.error.message || 'Failed to create applicant';
      })
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
        state.error = (action.payload as string) || action.error.message || 'Failed to update applicant';
      })
      .addCase(deleteApplicant.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(deleteApplicant.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const deletedId = action.payload?.id || action.meta.arg;
        state.items = state.items.filter((app: any) => app._id !== deletedId && app.id !== deletedId);
      })
      .addCase(deleteApplicant.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) || action.error.message || 'Failed to delete applicant';
      });
  },
});

export const { clearError } = applicantsSlice.actions;
export default applicantsSlice.reducer;
