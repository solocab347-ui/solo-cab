import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { CourseCompletionCommissionDialog } from "../CourseCompletionCommissionDialog";

// Mock supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          maybeSingle: vi.fn(),
        })),
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({ subscribe: vi.fn() })),
    })),
    removeChannel: vi.fn(),
  },
}));

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  courseId: "test-course-1",
  driverId: "test-driver-1",
  courseAmount: 45.00,
  pickupAddress: "Gare de Lyon, Paris",
  destinationAddress: "CDG Airport",
  scheduledDate: "2026-03-25T14:00:00Z",
  onConfirm: vi.fn(),
};

describe("CourseCompletionCommissionDialog - Payment Scenarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the dialog with course details", () => {
    render(<CourseCompletionCommissionDialog {...defaultProps} />);
    expect(screen.getByText("Course terminée !")).toBeInTheDocument();
    expect(screen.getByText(/Gare de Lyon/)).toBeInTheDocument();
    expect(screen.getByText(/CDG Airport/)).toBeInTheDocument();
  });

  it("shows total amount correctly", () => {
    render(<CourseCompletionCommissionDialog {...defaultProps} />);
    expect(screen.getByText("45.00 €")).toBeInTheDocument();
  });

  it("renders the dialog when open", () => {
    render(<CourseCompletionCommissionDialog {...defaultProps} />);
    expect(screen.getByText("Récapitulatif de votre course")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<CourseCompletionCommissionDialog {...defaultProps} open={false} />);
    expect(screen.queryByText("Course terminée !")).not.toBeInTheDocument();
  });
});
