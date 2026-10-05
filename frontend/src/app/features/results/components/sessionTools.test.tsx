import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { ExerciseSetView } from "./ExerciseSetView";
import { GamePanel } from "./GamePanel";
import { SessionCard } from "./SessionCard";
import { translations } from "@/app/shared/i18n/messages";
import { lesson } from "@/test/fixtures";
import type { ExerciseSet, Game } from "@/app/shared/schemas/domain";

const t = translations("en");
const set: ExerciseSet = {
  title: "Leaf worksheet",
  instructions: "Work quietly.",
  items: [
    {
      prompt: "What do plants need?",
      type: "short",
      options: [],
      answer: "Sunlight",
      explanation: "They convert light.",
    },
  ],
};
const game: Game = {
  title: "Leaf match",
  kind: "matching",
  quiz: { questions: [] },
  matching: { pairs: [{ left: "Sun", right: "Energy" }] },
};

vi.mock("../hooks/useSessionTools", () => ({
  useSessionTools: () => ({
    loading: "",
    tool: "worksheet",
    exercise: {
      title: "Leaf worksheet",
      instructions: "Work quietly.",
      items: [
        {
          prompt: "What do plants need?",
          type: "short",
          options: [],
          answer: "Sunlight",
          explanation: "They convert light.",
        },
      ],
    },
    game: null,
    failed: "",
    exporting: false,
    generate: vi.fn(),
    exportExercise: vi.fn(),
    exportGame: vi.fn(),
  }),
}));

it("renders worksheet items and toggles the answer key", async () => {
  const user = userEvent.setup();
  render(
    <ExerciseSetView set={set} t={t} kind="worksheet" onExport={() => {}} />,
  );
  expect(screen.getByText("Leaf worksheet")).toBeInTheDocument();
  expect(screen.getByText("What do plants need?")).toBeInTheDocument();
  expect(screen.queryByText(/Sunlight/)).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: t.showAnswers }));
  expect(screen.getByText(t.answerKey)).toBeInTheDocument();
  expect(screen.getByText(/Sunlight/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: t.hideAnswers }));
  expect(screen.queryByText(t.answerKey)).not.toBeInTheDocument();
});

it("previews a game and offers a download action", async () => {
  const user = userEvent.setup();
  const onDownload = vi.fn();
  render(<GamePanel game={game} t={t} onDownload={onDownload} />);
  expect(screen.getByText("Leaf match")).toBeInTheDocument();
  expect(screen.getByText(/Sun/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: t.downloadGame }));
  expect(onDownload).toHaveBeenCalledOnce();
});

it("shows session tool icons next to the download control", () => {
  render(
    <SessionCard
      lesson={lesson}
      sessionNumber={1}
      sessionCount={2}
      variantNumber={1}
      t={t}
      initiallyExpanded
      downloading={false}
      onExport={() => {}}
    />,
  );
  expect(screen.getByRole("group", { name: t.sessionTools })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: t.worksheet })).toHaveAttribute(
    "title",
    t.worksheet,
  );
  expect(screen.getByRole("button", { name: t.quiz })).toHaveAttribute(
    "title",
    t.quiz,
  );
  expect(screen.getByRole("button", { name: t.game })).toHaveAttribute(
    "title",
    t.game,
  );
  expect(screen.getByRole("button", { name: `${t.exportPdf}: Session 1 of 2` })).toBeInTheDocument();
  expect(screen.getByText("Leaf worksheet")).toBeInTheDocument();
});
