import ErrorMsgPage from "../error/msg/page";

export default function GuestAccessErrorPage(props) {
  return <ErrorMsgPage {...props} showLogin={false} />;
}
