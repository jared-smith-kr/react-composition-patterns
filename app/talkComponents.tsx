import React from "react";

// Basic
function MyBasicComponent() {
  return <p>Hello World!</p>;
}

export function MyBasicComposition() {
  return (
    <section>
      <h3>Greeting:</h3>
      <MyBasicComponent />
    </section>
  );
}

// Inheritance
class MyOtherBasic extends React.Component {
  render() {
    return <p>Goodbye, cruel world!</p>;
  }
}

export class MyOtherComposed extends MyOtherBasic {
  render() {
    return (
      <section>
        <h3>Farewell:</h3>
        {super.render()}
      </section>
    );
  }
}

// HOC
function withGreeting<P extends {}>(
  Comp: React.ComponentType<P>,
): React.ComponentType<P> {
  return (props) => (
    <section>
      <span>Hello there, </span>
      <Comp {...props} />
      <span>!</span>
    </section>
  );
}

export const GreetUser = withGreeting(({ user }: { user: string }) => (
  <span>User {user}</span>
));

// Hook
const useGreeting = (user: string) => <span>User {user}</span>;
export function GreetBob() {
  const nameo = useGreeting("Bob");
  return (
    <section>
      <span>Hello there, </span>
      {nameo}
      <span>!</span>
    </section>
  );
}

// Context

// NOTE: TS enums suck but you could use one here for the keys
type Colors =
  | "RED"
  | "ORANGE"
  | "YELLOW"
  | "GREEN"
  | "BLUE"
  | "INDIGO"
  | "VIOLET";

export const Color: Record<Colors, string> = {
  RED: "#FF0000",
  BLUE: "#0000FF",
  GREEN: "#00FF00",
  VIOLET: "#7F00FF",
  ORANGE: "#FFA500",
  YELLOW: "#FFFF00",
  INDIGO: "#4B0082",
};

type User = {
  name: string;
  favoriteColor: (typeof Color)[Colors];
};

const DEFAULT_USER = { name: "Pete Jones", favoriteColor: Color.BLUE };

const AccountDetailsContext = React.createContext(DEFAULT_USER);

export function MyContextual() {
  const { name, favoriteColor } = React.useContext(AccountDetailsContext);
  return (
    <AccountDetailsContext value={{ name, favoriteColor }}>
      <span style={{ backgroundColor: favoriteColor }}>Hello {name}</span>
    </AccountDetailsContext>
  );
}

// Better Context
const BetterAcctDetailCtxGetter = React.createContext(DEFAULT_USER);
const BetterAcctDetailCtxSetter = React.createContext(
  (_userDetails: User) => {},
);
export const AcctDetailProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [userDetails, setUserDetails] = React.useState(DEFAULT_USER); // could also use useReducer here
  return (
    <BetterAcctDetailCtxGetter value={userDetails}>
      <BetterAcctDetailCtxSetter value={setUserDetails}>
        {children}
      </BetterAcctDetailCtxSetter>
    </BetterAcctDetailCtxGetter>
  );
};
export const useAccount = () => {
  const getter = React.useContext(BetterAcctDetailCtxGetter);
  const setter = React.useContext(BetterAcctDetailCtxSetter);
  return [getter, setter];
};
export const useAccountDetails = () =>
  React.useContext(BetterAcctDetailCtxGetter);

export function FullCtx() {
  const { name, favoriteColor } = useAccountDetails();
  return <span style={{ backgroundColor: favoriteColor }}>Hello {name}</span>;
}
