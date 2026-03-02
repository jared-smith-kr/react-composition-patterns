import {
  AcctDetailProvider,
  FullCtx,
  MyContextual,
  MyBasicComposition,
  MyOtherComposed,
  GreetBob,
  GreetUser,
} from "../talkComponents";

export function Welcome() {
  return (
    <main className="flex items-center justify-center pt-16 pb-4">
      <div className="flex-1 flex flex-col items-center gap-16 min-h-0">
        <header className="flex flex-col items-center gap-9">
          React Composition Patterns:
        </header>
        <div className="max-w-[300px] w-full space-y-6 px-4">
          <MyBasicComposition />
          <MyOtherComposed />
          <GreetUser user="Bob" />
          <GreetBob />
          <MyContextual />
          <AcctDetailProvider>
            <FullCtx />
          </AcctDetailProvider>
        </div>
      </div>
    </main>
  );
}
