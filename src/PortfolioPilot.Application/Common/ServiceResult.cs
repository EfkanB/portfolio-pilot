namespace PortfolioPilot.Application.Common;

public enum ServiceResultStatus
{
    Success,
    NotFound,
    Invalid,
}

public sealed class ServiceResult<T>
{
    private ServiceResult(ServiceResultStatus status, T? value, string? error)
    {
        Status = status;
        Value = value;
        Error = error;
    }

    public ServiceResultStatus Status { get; }
    public T? Value { get; }
    public string? Error { get; }
    public bool IsSuccess => Status == ServiceResultStatus.Success;

    public static ServiceResult<T> Ok(T value) => new(ServiceResultStatus.Success, value, null);
    public static ServiceResult<T> NotFound(string? error = null) => new(ServiceResultStatus.NotFound, default, error);
    public static ServiceResult<T> Invalid(string error) => new(ServiceResultStatus.Invalid, default, error);
}
