using AutoMapper;
using PortfolioPilot.Application.DTOs;
using PortfolioPilot.Domain.Entities;

namespace PortfolioPilot.Application.Mappings;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<CreatePortfolioDto, Portfolio>()
            .ForMember(destination => destination.Id, options => options.Ignore())
            .ForMember(destination => destination.UserId, options => options.Ignore())
            .ForMember(destination => destination.CreatedAt, options => options.Ignore())
            .ForMember(destination => destination.User, options => options.Ignore())
            .ForMember(destination => destination.InvestmentFunds, options => options.Ignore())
            .ForMember(destination => destination.Transactions, options => options.Ignore());

        CreateMap<FundTransaction, FundTransactionDto>()
            .ForMember(destination => destination.Type, options => options.MapFrom(source => source.Type.ToString()));

        CreateMap<Portfolio, PortfolioDto>()
            .ForMember(destination => destination.Funds, options => options.MapFrom(source => source.InvestmentFunds));

        CreateMap<InvestmentFund, InvestmentFundDto>();
    }
}