import { LEDGER_SCOPE_LABEL } from "../../../domain/category";
import { TransactionFilter } from "../../../domain/types";
import { SegmentedControl } from "../../../shared/components";

const SCOPE_OPTIONS: TransactionFilter["scope"][] = ["all", "operating", "debt"];

type LedgerScopeSwitchProps = {
  value: TransactionFilter["scope"];
  onChange: (scope: TransactionFilter["scope"]) => void;
};

export function LedgerScopeSwitch({ value, onChange }: LedgerScopeSwitchProps) {
  return (
    <SegmentedControl
      title="View"
      options={SCOPE_OPTIONS}
      value={value}
      onChange={onChange}
      label={(scope) => LEDGER_SCOPE_LABEL[scope]}
    />
  );
}
